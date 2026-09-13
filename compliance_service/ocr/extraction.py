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

# Anchor patterns for Legal Metrology fields
_TAX_STATEMENT_PATTERN = re.compile(r"incl(?:usive|\.)?.{1,10}?tax", re.I)
_QUALIFIER_PATTERN = re.compile(r"\b(approx\.?|about)\b", re.I)

# MRP Patterns:
# Never join numbers across newlines (use [ \t] for inline spacing)
_ANCHORED_MRP_PATTERN = re.compile(
    r"(?:MRP|M\.R\.P\.?|MAX(?:IMUM)?\.?\s*RETAIL\s*PRICE|RETAIL\s*PRICE)\s*[:.\-]?[ \t]*(?:(?:Rs\.?|₹|INR)[ \t]*[:.\-]?[ \t]*)?(\d+(?:[.,]\d{1,2})?|\d+)\b",
    re.I
)
_CURRENCY_PRICE_PATTERN = re.compile(
    r"(?:₹|Rs\.?|INR)[ \t]*[:.\-]?[ \t]*(\d+(?:[.,]\d{1,2})?)\b",
    re.I
)

# Net Quantity Patterns:
_NET_QTY_LABEL_PATTERN = re.compile(
    r"(?:NET\s*(?:WEIGHT|WT\.?|QUANTITY|QTY\.?|CONTENTS?))\s*[:.\-]?[ \t]*",
    re.I
)
# Composite promotional packs: "40 g + 5 g EXTRA = 45 g", "40 g + 5 g EXTRA", "40g + 5g EXTRA - 45g"
_COMPOSITE_QTY_PATTERN = re.compile(
    r"(\d+(?:\.\d+)?)\s*(g|gm|gms|kg|ml|l)\s*\+\s*(\d+(?:\.\d+)?)\s*(g|gm|gms|kg|ml|l)?\s*(?:EXTRA|FREE)?(?:\s*[=\-]\s*(\d+(?:\.\d+)?)\s*(g|gm|gms|kg|ml|l)?)?",
    re.I
)
_STANDARD_QTY_PATTERN = re.compile(
    r"([\d]+(?:[.,]\d+)?)\s*(ml|@l|g|gm|gms|kg|l|litre|litres|cm|m)\b",
    re.I
)

# Date Patterns:
# Supports PKD, PKD., PKD:, PACKED ON, MFD, MFR, DATE OF PKG
_MFG_LABEL_PATTERN = re.compile(
    r"(?:MFG\.?\s*(?:DATE)?|MANUFACTURING\s*DATE|PKD\.?\s*(?:DATE|ON)?|PACKED\s*(?:ON|DATE)?|DATE\s*OF\s*PK[G\.]|M[FP]D\.?|MFR\.?)",
    re.I
)
# DD/MM/YYYY or DD/MM/YY: e.g. 15/6/26, 12/11/24, 15-06-2026
_DATE_DMY_PATTERN = re.compile(
    r"\b(0?[1-9]|[12]\d|3[01])\s*[/\-.]\s*(0?[1-9]|1[0-2])\s*[/\-.]\s*((?:19|20)?\d{2})\b"
)
# MM/YYYY or MM/YY: e.g. 08/2025, 11/24, 08/25
_DATE_MY_PATTERN = re.compile(
    r"\b(0?[1-9]|1[0-2])\s*[/\-.]\s*((?:19|20)\d{2}|\d{2})\b"
)
# Supports USE BY as well as BEST BEFORE / EXPIRY
_BEST_BEFORE_PATTERN = re.compile(
    r"(?:USE\s*(?:BY|BEFORE)|BEST\s*(?:BEFORE|BELORE|BETORE)|EXPIRY\s*(?:DATE)?|EXP\.?\s*(?:DATE)?)[^\n]*",
    re.I
)

_PHONE_PATTERN = re.compile(r"(?:\b1800[\s\-]?\d{2,4}[\s\-]?\d{3,4}\b|(?:\+?91[\s\-]?)?[6-9]\d{9}\b|\b0\d{2,4}[\s\-]?\d{6,8}\b)")
_EMAIL_PATTERN = re.compile(r"[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}")
_ADDRESS_LABEL_PATTERN = re.compile(r"(?:MANUFACTURED\s*(?:BY|FOR)|MARKETED\s*BY|MFD\.?\s*BY|PACKED\s*BY|PKD\.?\s*BY)", re.I)

# Common packaged FMCG categories under Legal Metrology Schedule II
_GENERIC_NAME_KEYWORDS = [
    # Food & FMCG categories
    "glucose biscuits", "glucose biscuit", "marie biscuits", "digestive biscuits",
    "biscuits", "biscuit", "cookies", "cookie", "rusk", "rusks",
    "chips", "potato chips", "namkeen", "wafers", "bhujia", "sev",
    "atta", "wheat flour", "maida", "besan", "sooji", "rava",
    "rice", "basmati rice", "poha",
    "sugar", "jaggery", "salt",
    "tea", "green tea", "coffee", "instant coffee",
    "noodles", "instant noodles", "pasta", "macaroni", "vermicelli",
    "oats", "corn flakes", "cereals", "muesli",
    "bread", "bun", "pav", "cake", "muffin",
    "butter", "ghee", "cheese", "paneer", "dahi", "curd", "yogurt", "milk",
    "chocolate", "chocolates", "confectionery", "candy", "toffee",
    "juice", "fruit juice", "packaged drinking water", "mineral water",
    "edible oil", "mustard oil", "sunflower oil", "soyabean oil", "groundnut oil",
    "spices", "masala", "turmeric", "chilli powder", "coriander powder",
    "pickle", "sauce", "ketchup", "tomato ketchup", "jam", "honey",
    "detergent", "detergent powder", "dishwash", "dishwash bar",

    # Personal Care / Cosmetics (original list preserved)
    "hair oil", "shampoo", "conditioner", "face wash", "body lotion",
    "soap", "toothpaste", "face cream", "sunscreen", "body wash",
    "serum", "moisturizer", "hand wash",
]


def _find_first(pattern: re.Pattern, text: str) -> Optional[re.Match]:
    return pattern.search(text)


def _extract_mrp(full_text: str) -> MRPDeclaration:
    values: List[float] = []
    best_value: Optional[float] = None
    raw_text: Optional[str] = None
    best_score = -1

    # 1. Direct anchored match: e.g. "MRP Rs. 5.00", "MRP: 5.00", "MRP ₹5.00", "M.R.P. 5.00"
    for m in _ANCHORED_MRP_PATTERN.finditer(full_text):
        val_str = m.group(1).replace(',', '.')
        try:
            val = float(val_str)
            if 0.5 <= val <= 100000:
                values.append(val)
                if 100 > best_score:
                    best_score = 100
                    best_value = val
                    raw_text = m.group(0).strip()
        except ValueError:
            pass

    # 2. Currency symbol match: e.g. "₹5.00", "Rs. 5.00"
    for m in _CURRENCY_PRICE_PATTERN.finditer(full_text):
        val_str = m.group(1).replace(',', '.')
        try:
            val = float(val_str)
            if 0.5 <= val <= 100000:
                values.append(val)
                if 70 > best_score:
                    best_score = 70
                    best_value = val
                    raw_text = m.group(0).strip()
        except ValueError:
            pass

    # 3. Line-level MRP proximity search (anchored to line containing MRP label)
    lines = full_text.splitlines()
    for i, line in enumerate(lines):
        line_clean = line.strip()
        if re.search(r"\b(?:mrp|m\.r\.p|max(?:imum)?\.?\s*retail\s*price)\b", line_clean, re.I):
            # Check current line
            for num_m in re.finditer(r"(?:₹|Rs\.?|INR)?\s*(\d+(?:[.,]\d{1,2})?)\b", line_clean):
                try:
                    val = float(num_m.group(1).replace(',', '.'))
                    if 0.5 <= val <= 100000:
                        values.append(val)
                        if 85 > best_score:
                            best_score = 85
                            best_value = val
                            raw_text = line_clean
                except ValueError:
                    pass
            # Check immediate next line if no price found on this line
            if best_score < 80 and i + 1 < len(lines):
                next_line = lines[i + 1].strip()
                for num_m in re.finditer(r"(?:₹|Rs\.?|INR)?\s*(\d+(?:[.,]\d{1,2})?)\b", next_line):
                    try:
                        val = float(num_m.group(1).replace(',', '.'))
                        if 0.5 <= val <= 100000:
                            values.append(val)
                            if 80 > best_score:
                                best_score = 80
                                best_value = val
                                raw_text = f"{line_clean} {next_line}"
                    except ValueError:
                        pass

    # Deduplicate detected values while preserving order
    unique_values = list(dict.fromkeys(values))

    if best_value is None:
        return MRPDeclaration()

    return MRPDeclaration(
        raw_text=raw_text or f"MRP: {best_value}",
        value=best_value,
        all_detected_values=unique_values,
        has_tax_statement=bool(_TAX_STATEMENT_PATTERN.search(full_text)),
    )


def _extract_net_quantity(full_text: str) -> NetQuantity:
    best_qty = NetQuantity()
    best_score = -1

    # 1. Composite / promotional declarations: "40 g + 5 g EXTRA = 45 g", "40 g + 5 g EXTRA"
    for m in _COMPOSITE_QTY_PATTERN.finditer(full_text):
        try:
            base_val = float(m.group(1).replace(',', '.'))
            unit = m.group(2).lower()
            if unit in ("gm", "gms"):
                unit = "g"
            extra_val = float(m.group(3).replace(',', '.'))
            # Check if explicit final total is present (e.g. "= 45 g")
            if m.group(5):
                total_val = float(m.group(5).replace(',', '.'))
                if m.group(6):
                    u = m.group(6).lower()
                    if u in ("gm", "gms"):
                        unit = "g"
                    else:
                        unit = u
            else:
                total_val = base_val + extra_val

            window_start = max(0, m.start() - 25)
            context = full_text[window_start:m.end() + 10]
            score = 90
            if _NET_QTY_LABEL_PATTERN.search(context):
                score = 110

            if score > best_score:
                best_score = score
                best_qty = NetQuantity(
                    value=total_val,
                    unit=unit,
                    raw_text=m.group(0).strip(),
                    is_qualified=bool(_QUALIFIER_PATTERN.search(context)),
                )
        except ValueError:
            pass

    # 2. Standard labeled quantity: "NET WEIGHT: 45 g", "NET WT. 45g"
    for lm in _NET_QTY_LABEL_PATTERN.finditer(full_text):
        sub_text = full_text[lm.end():lm.end() + 35]
        qm = _STANDARD_QTY_PATTERN.search(sub_text)
        if qm:
            try:
                val = float(qm.group(1).replace(',', '.'))
                unit = qm.group(2).lower()
                if unit in ("gm", "gms"):
                    unit = "g"
                if unit == "@l":
                    unit = "ml"
                if val > 0 and unit in ("ml", "g", "kg", "l"):
                    if 100 > best_score:
                        best_score = 100
                        best_qty = NetQuantity(
                            value=val,
                            unit=unit,
                            raw_text=full_text[lm.start():lm.end() + qm.end()].strip(),
                            is_qualified=bool(_QUALIFIER_PATTERN.search(sub_text)),
                        )
            except ValueError:
                pass

    # 3. Fallback standard quantity search if no high-confidence candidate found
    if best_score < 50:
        for m in _STANDARD_QTY_PATTERN.finditer(full_text):
            try:
                val = float(m.group(1).replace(',', '.'))
                unit = m.group(2).lower()
                if unit in ("gm", "gms"):
                    unit = "g"
                if unit == "@l":
                    unit = "ml"
                if val > 0 and unit in ("ml", "g", "kg", "l"):
                    window_start = max(0, m.start() - 15)
                    context = full_text[window_start:m.end() + 5]
                    score = 40
                    if score > best_score:
                        best_score = score
                        best_qty = NetQuantity(
                            value=val,
                            unit=unit,
                            raw_text=m.group(0).strip(),
                            is_qualified=bool(_QUALIFIER_PATTERN.search(context)),
                        )
            except ValueError:
                pass

    return best_qty


def _extract_dates(full_text: str) -> DateDeclaration:
    mfg_month_year = None
    best_before_text = None

    # 1. Manufacturing / Packing date
    mfg_label_match = _MFG_LABEL_PATTERN.search(full_text)
    if mfg_label_match:
        window = full_text[mfg_label_match.end():mfg_label_match.end() + 50]
        # Check DD/MM/YY(YY) first
        dmy_match = _DATE_DMY_PATTERN.search(window)
        if dmy_match:
            month = int(dmy_match.group(2))
            year_str = dmy_match.group(3)
            year = int("20" + year_str if len(year_str) == 2 else year_str)
            mfg_month_year = f"{month:02d}/{year}"
        else:
            my_match = _DATE_MY_PATTERN.search(window)
            if my_match:
                month = int(my_match.group(1))
                year_str = my_match.group(2)
                year = int("20" + year_str if len(year_str) == 2 else year_str)
                mfg_month_year = f"{month:02d}/{year}"

    if mfg_month_year is None:
        # Fallback: any standard 4-digit MM/YYYY in the full text
        my_match = re.search(r"\b(0[1-9]|1[0-2])\s*[/\-]\s*((?:19|20)\d{2})\b", full_text)
        if my_match:
            mfg_month_year = my_match.group(0)

    # 2. Best before / Use by date
    bb_match = _BEST_BEFORE_PATTERN.search(full_text)
    if bb_match:
        line_text = bb_match.group(0).strip()
        # If line ends with a colon or is very short (e.g. "USE BY:"), search adjacent text for date
        if line_text.endswith(":") or len(line_text) <= 10:
            window = full_text[bb_match.end():bb_match.end() + 30]
            date_m = _DATE_DMY_PATTERN.search(window) or _DATE_MY_PATTERN.search(window)
            if date_m:
                line_text = f"{line_text} {date_m.group(0).strip()}"
        best_before_text = line_text

    return DateDeclaration(
        manufacture_month_year=mfg_month_year,
        best_before_text=best_before_text,
    )


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
    start = label_match.start()
    return full_text[start:start + 250].replace("\n", " ").strip()


def _extract_generic_name(full_text: str) -> Optional[str]:
    lowered = full_text.lower()
    # Sort by length descending so multi-word categories match before single words
    for keyword in sorted(_GENERIC_NAME_KEYWORDS, key=len, reverse=True):
        pattern = r"\b" + re.escape(keyword) + r"\b"
        if re.search(pattern, lowered):
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
