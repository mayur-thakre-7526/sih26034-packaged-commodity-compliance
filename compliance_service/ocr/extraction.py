"""Parses OCRResult (raw text + boxes) into ExtractedDeclarations (the
schema rule_engine/engine.py actually checks). This is the only file that
should know both "what tesseract gave us" and "what a Legal Metrology
declaration looks like as text" -- ocr_engine.py knows neither.

Every pattern here is a best-effort heuristic tuned against real Indian
FMCG packaging text (see the worked example in run_extraction_demo below).
It will miss atypical layouts/wording -- that's expected for a hackathon
MVP. Treat a None/empty field as "extraction didn't find it," which the
rule engine already interprets correctly as a missing declaration.
"""
from __future__ import annotations

import re
from typing import List, Optional

from ocr.ocr_engine import OCRLine, OCRResult
from rule_engine.models import ConsumerCare, DateDeclaration, ExtractedDeclarations, MRPDeclaration, NetQuantity

_MRP_PATTERN = re.compile(r"(?<!\d)(\d{1,4}[\.\s]\d{2})(?!\d)", re.I)
_TAX_STATEMENT_PATTERN = re.compile(r"incl(?:usive|\.)?.{1,10}?tax", re.I)
_QUALIFIER_PATTERN = re.compile(r"\b(approx\.?|about)\b", re.I)

_NET_QTY_PATTERN = re.compile(
    r"([\d]+(?:[\.\s]\d+)?)\s*(ml|@l|g|gm|gms|kg|l|litre|litres|cm|m)\b",
    re.I,
)

# "MFG.Date : 08/2025" or a bare "08/2025" near a Mfg.Date label line
_MONTH_YEAR_PATTERN = re.compile(r"\b(0[1-9]|1[0-2])\s*[/\-]\s*((?:19|20)\d{2})\b")
_MFG_LABEL_PATTERN = re.compile(r"MFG\.?\s*DATE|MANUFACTURING\s*DATE", re.I)
_BEST_BEFORE_PATTERN = re.compile(r"(use|best)\s*(before|belore|betore)[^\n]*", re.I)

_PHONE_PATTERN = re.compile(r"(?:\+?91[\s\-]?)?[6-9]\d{9}")
_EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
_ADDRESS_LABEL_PATTERN = re.compile(r"MARKETED\s*BY|MANUFACTURED\s*BY", re.I)

# MVP shortcut: generic/common name detection via a small keyword list
# rather than general NLP. Extend this list as you test more product
# categories -- it will only ever be as good as this list.
_GENERIC_NAME_KEYWORDS = [
    "hair oil", "shampoo", "conditioner", "face wash", "body lotion",
    "soap", "toothpaste", "face cream", "sunscreen", "body wash",
    "serum", "moisturizer", "face wash", "hand wash",
]


def _find_first(pattern: re.Pattern, text: str) -> Optional[re.Match]:
    return pattern.search(text)


def _extract_mrp(full_text: str) -> MRPDeclaration:
    matches = _MRP_PATTERN.findall(full_text)
    values = []
    for m in matches:
        val_str = re.sub(r'\s', '.', m)
        try:
            val = float(val_str)
            if 10 <= val <= 5000:  # Reasonable MRP range to filter out random OCR numbers
                values.append(val)
        except ValueError:
            continue
    if not values:
        return MRPDeclaration()
        
    start_idx = max(0, full_text.lower().find("mrp"))
    best_value = max(values)
    return MRPDeclaration(
        raw_text=f"MRP: {best_value}",
        value=best_value,
        all_detected_values=values,
        has_tax_statement=bool(_TAX_STATEMENT_PATTERN.search(full_text)),
    )


def _extract_net_quantity(full_text: str) -> NetQuantity:
    best_qty = NetQuantity()
    for m in _NET_QTY_PATTERN.finditer(full_text):
        value_str = re.sub(r'\s', '.', m.group(1))
        unit = m.group(2)
        if unit.lower() == "@l":
            unit = "ml"
        try:
            value = float(value_str)
            # Prioritize standard units and skip weird 0 values
            if value > 0 and unit.lower() in ("ml", "g", "kg", "l"):
                window_start = max(0, m.start() - 15)
                context = full_text[window_start:m.end() + 5]
                best_qty = NetQuantity(
                    value=value,
                    unit=unit.lower(),
                    raw_text=m.group(0),
                    is_qualified=bool(_QUALIFIER_PATTERN.search(context))
                )
        except ValueError:
            continue
    return best_qty


def _extract_dates(full_text: str) -> DateDeclaration:
    mfg_month_year = None
    mfg_label_match = _MFG_LABEL_PATTERN.search(full_text)
    if mfg_label_match:
        # look for a month/year within ~40 chars after the label
        window = full_text[mfg_label_match.end():mfg_label_match.end() + 40]
        my_match = _MONTH_YEAR_PATTERN.search(window)
        if my_match:
            mfg_month_year = my_match.group(0)
    if mfg_month_year is None:
        # fallback: any bare month/year pattern anywhere in the text
        my_match = _MONTH_YEAR_PATTERN.search(full_text)
        if my_match:
            mfg_month_year = my_match.group(0)

    best_before_match = _BEST_BEFORE_PATTERN.search(full_text)
    best_before_text = best_before_match.group(0).strip() if best_before_match else None

    return DateDeclaration(manufacture_month_year=mfg_month_year, best_before_text=best_before_text)


def _extract_consumer_care(full_text: str) -> ConsumerCare:
    phone_match = _PHONE_PATTERN.search(full_text)
    email_match = _EMAIL_PATTERN.search(full_text)
    return ConsumerCare(
        phone=phone_match.group(0) if phone_match else None,
        email=email_match.group(0) if email_match else None,
    )


def _extract_manufacturer_address(lines: List[OCRLine], full_text: str) -> Optional[str]:
    label_match = _ADDRESS_LABEL_PATTERN.search(full_text)
    if not label_match:
        return None
    # grab this label's line plus the next few lines as the address block --
    # a real implementation should use bbox proximity, not just line order,
    # once regions come from image_processing/perspective.py's rectified
    # coordinate space consistently.
    start = label_match.start()
    return full_text[start:start + 250].replace("\n", " ").strip()


def _extract_generic_name(full_text: str) -> Optional[str]:
    lowered = full_text.lower()
    for keyword in _GENERIC_NAME_KEYWORDS:
        if keyword in lowered:
            return keyword.title()
    return None


def _normalize_numerals(text: str) -> str:
    replacements = {
        '०': '0', '१': '1', '२': '2', '३': '3', '४': '4',
        '५': '5', '६': '6', '७': '7', '८': '8', '९': '9'
    }
    for hi, en in replacements.items():
        text = text.replace(hi, en)
    return text


def extract_declarations(ocr_result: OCRResult) -> ExtractedDeclarations:
    full_text = _normalize_numerals(ocr_result.full_text)
    return ExtractedDeclarations(
        manufacturer_address=_extract_manufacturer_address(ocr_result.lines, full_text),
        generic_name=_extract_generic_name(full_text),
        country_of_origin=None,  # left for a human/master-data cross-check; free-text extraction here is unreliable
        net_quantity=_extract_net_quantity(full_text),
        mrp=_extract_mrp(full_text),
        mfg_date=_extract_dates(full_text),
        consumer_care=_extract_consumer_care(full_text),
    )
