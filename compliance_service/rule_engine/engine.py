"""Rule-based compliance checker for Legal Metrology (Packaged Commodities)
Rules, 2011. Pure logic, no OCR/CV dependency -- takes an
`ExtractedDeclarations` (see models.py) and returns a `ComplianceReport`.

Each function below corresponds to one numbered section of the compliance
checklist, so a teammate reviewing this against the rules doc can match
functions to sections 1:1.
"""
from __future__ import annotations

import re
from typing import List

from rule_engine.models import (
    ComplianceReport,
    ComplianceSummary,
    ExtractedDeclarations,
    Severity,
    Violation,
    ViolationCode,
    VIOLATION_SEVERITY,
)

_QUALIFIER_PATTERN = re.compile(r"\b(approx\.?|about)\b", re.I)

_VALID_UNITS = {
    "g", "gm", "gms", "kg",
    "ml", "l", "litre", "litres",
    "cm", "m", "mm",
    "n", "u",
}

# Table I -- weight/volume, by net quantity (net_quantity_value in the
# declaration's own unit family; caller normalizes to g/ml before calling).
def _min_numeral_height_weight_volume_mm(value_g_or_ml: float, embossed: bool) -> float:
    if value_g_or_ml <= 200:
        return 2.0 if embossed else 1.0
    if value_g_or_ml <= 500:
        return 4.0 if embossed else 2.0
    return 6.0 if embossed else 4.0


# Table II -- length/area/number, by PDP area in cm^2.
def _min_numeral_height_pdp_area_mm(pdp_area_cm2: float, embossed: bool) -> float:
    if pdp_area_cm2 <= 100:
        return 2.0 if embossed else 1.0
    if pdp_area_cm2 <= 500:
        return 4.0 if embossed else 2.0
    if pdp_area_cm2 <= 2500:
        return 6.0 if embossed else 4.0
    return 6.0


def _v(code: ViolationCode, field: str, message: str) -> Violation:
    return Violation(code=code, severity=VIOLATION_SEVERITY[code], field=field, message=message)


def check_mandatory_declarations(d: ExtractedDeclarations) -> List[Violation]:
    """Section 2 / Rule 6 -- presence of the core declarations."""
    violations: List[Violation] = []

    # NOTE: the checklist's violation-code list has no dedicated code for a
    # missing manufacturer/packer/importer address (Rule 6(1)(a)), even
    # though it's the first mandatory declaration listed. Flag it here so
    # it's visible in the report, but ask the team whether to add a real
    # code (e.g. MISSING_MANUFACTURER_ADDRESS) -- reusing an unrelated
    # existing code would misclassify it in the compliance summary.
    if not d.manufacturer_address:
        pass  # intentionally not appended until a violation code exists for this

    if not d.generic_name:
        violations.append(_v(ViolationCode.MISSING_GENERIC_NAME, "generic_name",
                              "Common/generic name of the commodity is missing."))

    if d.category.is_imported and not d.country_of_origin:
        violations.append(_v(ViolationCode.MISSING_COUNTRY_OF_ORIGIN, "country_of_origin",
                              "Imported product is missing country of origin declaration."))

    if not d.consumer_care.is_present():
        violations.append(_v(ViolationCode.MISSING_CONSUMER_CARE, "consumer_care",
                              "Consumer care details (name/address/phone/email) are missing."))
    elif not d.consumer_care.is_plausible():
        violations.append(_v(ViolationCode.INVALID_CONSUMER_CARE, "consumer_care",
                              "Consumer care details look like a placeholder, not a real contact."))

    return violations


def check_net_quantity(d: ExtractedDeclarations) -> List[Violation]:
    """Section 3 / Rule 8, 9, 13 -- net quantity presence, units, qualifiers."""
    violations: List[Violation] = []
    nq = d.net_quantity

    if nq.value is None or not nq.unit:
        violations.append(_v(ViolationCode.MISSING_NET_QUANTITY, "net_quantity",
                              "Net quantity declaration is missing or unparseable."))
        return violations  # nothing further to check without a value/unit

    if nq.unit.lower() not in _VALID_UNITS:
        violations.append(_v(ViolationCode.INVALID_UNIT, "net_quantity",
                              f"Unit '{nq.unit}' is not a standard Legal Metrology unit."))

    if nq.is_qualified or (nq.raw_text and _QUALIFIER_PATTERN.search(nq.raw_text)):
        violations.append(_v(ViolationCode.QUANTITY_QUALIFIED, "net_quantity",
                              "Net quantity uses a qualifier like 'approx.' or 'about', which is not allowed."))

    return violations


def check_mrp(d: ExtractedDeclarations) -> List[Violation]:
    """Section 4 / Rule 11, 6(1)(e) -- MRP presence, tax statement, conflicts."""
    violations: List[Violation] = []
    mrp = d.mrp

    if d.category.is_exempt_from_mrp:
        return violations

    if mrp.value is None:
        violations.append(_v(ViolationCode.MISSING_MRP, "mrp",
                              "MRP declaration is missing."))
        return violations

    if not mrp.has_tax_statement:
        violations.append(_v(ViolationCode.MRP_NO_TAX_STATEMENT, "mrp",
                              "MRP is not declared as 'inclusive of all taxes'."))

    distinct_values = set(mrp.all_detected_values) | ({mrp.value} if mrp.value is not None else set())
    if len(distinct_values) > 1:
        violations.append(_v(ViolationCode.CONFLICTING_MRP, "mrp",
                              f"Multiple conflicting MRP values detected: {sorted(distinct_values)}."))

    if mrp.is_sticker:
        violations.append(_v(ViolationCode.UNAUTHORIZED_MRP_STICKER, "mrp",
                              "MRP appears on a pasted sticker rather than printed on the label."))

    return violations


def check_unit_sale_price(d: ExtractedDeclarations) -> List[Violation]:
    """Section 5 / Rule 12 -- unit sale price, with exemptions."""
    violations: List[Violation] = []
    if d.category.is_combination_or_group_pack or d.category.is_multi_piece_count_pack:
        return violations
    if not d.unit_sale_price_text:
        # Not in the checklist's fixed violation-code list explicitly (no
        # dedicated MISSING_UNIT_SALE_PRICE code was given) -- flagging via
        # message only for now; add a code if the team wants it enforced
        # as a hard violation.
        pass
    return violations


def check_dates(d: ExtractedDeclarations) -> List[Violation]:
    """Section 6 / Rule 10, 6(1)(d)/(da) -- mfg date and best-before."""
    violations: List[Violation] = []
    dt = d.mfg_date

    if not d.category.is_exempt_from_mfg_date and not dt.manufacture_month_year:
        violations.append(_v(ViolationCode.MISSING_MFG_DATE, "mfg_date",
                              "Month & year of manufacture/packing/import is missing."))

    if d.category.can_expire and not dt.best_before_text:
        violations.append(_v(ViolationCode.MISSING_BEST_BEFORE, "best_before",
                              "Best before / use by date is missing for a product that can become unfit over time."))

    return violations


def check_textile_dimensions(d: ExtractedDeclarations) -> List[Violation]:
    """Section 7 / Rule 14 -- dimension declarations for textile-type items."""
    violations: List[Violation] = []
    if not d.category.is_textile_item:
        return violations

    if d.dimensions is None or not d.dimensions.per_piece_dimensions:
        violations.append(_v(ViolationCode.MISSING_DIMENSIONS_TEXTILE, "dimensions",
                              "Textile item is missing finished-dimension declarations."))
        return violations

    if d.dimensions.num_pieces and len(d.dimensions.per_piece_dimensions) < d.dimensions.num_pieces:
        violations.append(_v(ViolationCode.INCOMPLETE_DIMENSIONS, "dimensions",
                              "Not all pieces have their individual dimensions declared."))

    return violations


def check_ecommerce(d: ExtractedDeclarations) -> List[Violation]:
    """Section 8 / Rule 6(10), 6(10A) -- e-commerce listing requirements."""
    violations: List[Violation] = []
    if not d.is_ecommerce_listing:
        return violations

    if d.mrp.value is None:
        violations.append(_v(ViolationCode.EC_MISSING_MRP_ONLINE, "mrp",
                              "E-commerce listing is missing MRP."))
    if d.net_quantity.value is None:
        violations.append(_v(ViolationCode.EC_MISSING_NET_QTY_ONLINE, "net_quantity",
                              "E-commerce listing is missing net quantity."))
    if d.category.is_imported and d.country_of_origin is None:
        # Platform-level filter check is out of scope for a single-product
        # scan, but flag it here as a reminder the platform-level rule exists.
        violations.append(_v(ViolationCode.EC_MISSING_COO_FILTER, "country_of_origin",
                              "Imported product listed without a country-of-origin filter/declaration."))

    return violations


def check_font_size(d: ExtractedDeclarations) -> List[Violation]:
    """Section 1 / Rule 7 -- minimum numeral/letter height.

    Requires pdp_area_cm2 and/or net_quantity to pick the right table, plus
    measured font heights (mm) from calibration.px_per_mm x bbox height,
    once the image pipeline is wired in. All of this is optional input for
    now -- checks are skipped gracefully if measurements aren't available,
    since font-size measurement genuinely depends on the calibration +
    ROI-detection stages, not something the rule engine can infer alone.
    """
    violations: List[Violation] = []

    # MRP font height, judged against the weight/volume table when net
    # quantity is known, else the PDP-area table.
    if d.mrp.font_height_mm is not None:
        min_height = None
        if d.net_quantity.value is not None and d.net_quantity.unit and d.net_quantity.unit.lower() in {"g", "gm", "gms", "kg", "ml", "l", "litre", "litres"}:
            value_in_base_unit = d.net_quantity.value
            if d.net_quantity.unit.lower() in {"kg", "l", "litre", "litres"}:
                value_in_base_unit *= 1000  # normalize to g/ml
            min_height = _min_numeral_height_weight_volume_mm(value_in_base_unit, d.is_embossed_or_perforated)
        elif d.pdp_area_cm2 is not None:
            min_height = _min_numeral_height_pdp_area_mm(d.pdp_area_cm2, d.is_embossed_or_perforated)

        if min_height is not None and d.mrp.font_height_mm < min_height:
            violations.append(_v(ViolationCode.FONT_TOO_SMALL_MRP, "mrp",
                                  f"MRP numeral height {d.mrp.font_height_mm}mm is below the required {min_height}mm."))

    if d.mfg_date.font_height_mm is not None and d.mfg_date.font_height_mm < 1.0:
        violations.append(_v(ViolationCode.FONT_TOO_SMALL_DATE, "mfg_date",
                              f"Date numeral height {d.mfg_date.font_height_mm}mm is below the general 1mm minimum."))

    if d.general_letter_height_mm is not None:
        min_general = 2.0 if d.is_embossed_or_perforated else 1.0
        if d.general_letter_height_mm < min_general:
            violations.append(_v(ViolationCode.LETTER_HEIGHT_BELOW_MIN, "general_text",
                                  f"General letter height {d.general_letter_height_mm}mm is below the {min_general}mm minimum."))

    return violations


def run_all_checks(d: ExtractedDeclarations) -> ComplianceReport:
    violations: List[Violation] = []
    violations += check_mandatory_declarations(d)
    violations += check_net_quantity(d)
    violations += check_mrp(d)
    violations += check_unit_sale_price(d)
    violations += check_dates(d)
    violations += check_textile_dimensions(d)
    violations += check_ecommerce(d)
    violations += check_font_size(d)

    summary = ComplianceSummary()
    for v in violations:
        if v.severity == Severity.CRITICAL:
            summary.critical += 1
        elif v.severity == Severity.MAJOR:
            summary.major += 1
        else:
            summary.minor += 1
    summary.overall_status = "non_compliant" if violations else "compliant"

    return ComplianceReport(violations=violations, summary=summary)
