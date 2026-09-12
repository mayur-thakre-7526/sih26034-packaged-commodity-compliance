"""Data models for Legal Metrology (Packaged Commodities) Rules, 2011
compliance checking.

This is the CONTRACT between the (future) OCR/extraction module and the
rule engine. The rule engine only ever consumes `ExtractedDeclarations` --
it has no idea whether those fields came from OCR, manual entry, or a
hand-written test fixture. Build and demo the rule engine against
hand-constructed ExtractedDeclarations now; wire OCR in later without
touching engine.py at all.
"""
from __future__ import annotations

from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, Field


class Severity(str, Enum):
    CRITICAL = "critical"
    MAJOR = "major"
    MINOR = "minor"


class ViolationCode(str, Enum):
    MISSING_MRP = "MISSING_MRP"
    MISSING_NET_QUANTITY = "MISSING_NET_QUANTITY"
    UNAUTHORIZED_MRP_STICKER = "UNAUTHORIZED_MRP_STICKER"
    MRP_NO_TAX_STATEMENT = "MRP_NO_TAX_STATEMENT"
    CONFLICTING_MRP = "CONFLICTING_MRP"
    INVALID_UNIT = "INVALID_UNIT"
    QUANTITY_QUALIFIED = "QUANTITY_QUALIFIED"
    MISSING_MFG_DATE = "MISSING_MFG_DATE"
    MISSING_BEST_BEFORE = "MISSING_BEST_BEFORE"
    MISSING_CONSUMER_CARE = "MISSING_CONSUMER_CARE"
    MISSING_GENERIC_NAME = "MISSING_GENERIC_NAME"
    MISSING_DIMENSIONS_TEXTILE = "MISSING_DIMENSIONS_TEXTILE"
    MISSING_COUNTRY_OF_ORIGIN = "MISSING_COUNTRY_OF_ORIGIN"
    FONT_TOO_SMALL_MRP = "FONT_TOO_SMALL_MRP"
    OBSCURED_DECLARATION = "OBSCURED_DECLARATION"
    INVALID_CONSUMER_CARE = "INVALID_CONSUMER_CARE"
    INCOMPLETE_DIMENSIONS = "INCOMPLETE_DIMENSIONS"
    FONT_TOO_SMALL_DATE = "FONT_TOO_SMALL_DATE"
    LETTER_HEIGHT_BELOW_MIN = "LETTER_HEIGHT_BELOW_MIN"
    LOW_CONTRAST = "LOW_CONTRAST"
    EC_MISSING_MRP_ONLINE = "EC_MISSING_MRP_ONLINE"
    EC_MISSING_NET_QTY_ONLINE = "EC_MISSING_NET_QTY_ONLINE"
    EC_MISSING_COO_FILTER = "EC_MISSING_COO_FILTER"


# Every violation code's fixed severity, straight from the checklist.
VIOLATION_SEVERITY = {
    ViolationCode.MISSING_MRP: Severity.CRITICAL,
    ViolationCode.MISSING_NET_QUANTITY: Severity.CRITICAL,
    ViolationCode.UNAUTHORIZED_MRP_STICKER: Severity.CRITICAL,
    ViolationCode.MRP_NO_TAX_STATEMENT: Severity.MAJOR,
    ViolationCode.CONFLICTING_MRP: Severity.MAJOR,
    ViolationCode.INVALID_UNIT: Severity.MAJOR,
    ViolationCode.QUANTITY_QUALIFIED: Severity.MAJOR,
    ViolationCode.MISSING_MFG_DATE: Severity.MAJOR,
    ViolationCode.MISSING_BEST_BEFORE: Severity.MAJOR,
    ViolationCode.MISSING_CONSUMER_CARE: Severity.MAJOR,
    ViolationCode.MISSING_GENERIC_NAME: Severity.MAJOR,
    ViolationCode.MISSING_DIMENSIONS_TEXTILE: Severity.MAJOR,
    ViolationCode.MISSING_COUNTRY_OF_ORIGIN: Severity.MAJOR,
    ViolationCode.FONT_TOO_SMALL_MRP: Severity.MAJOR,
    ViolationCode.OBSCURED_DECLARATION: Severity.MAJOR,
    ViolationCode.INVALID_CONSUMER_CARE: Severity.MINOR,
    ViolationCode.INCOMPLETE_DIMENSIONS: Severity.MINOR,
    ViolationCode.FONT_TOO_SMALL_DATE: Severity.MINOR,
    ViolationCode.LETTER_HEIGHT_BELOW_MIN: Severity.MINOR,
    ViolationCode.LOW_CONTRAST: Severity.MINOR,
    ViolationCode.EC_MISSING_MRP_ONLINE: Severity.CRITICAL,
    ViolationCode.EC_MISSING_NET_QTY_ONLINE: Severity.MAJOR,
    ViolationCode.EC_MISSING_COO_FILTER: Severity.MAJOR,
}


class NetQuantity(BaseModel):
    value: Optional[float] = None
    unit: Optional[str] = None          # as extracted, e.g. "ml", "gm", "Kg"
    raw_text: Optional[str] = None      # e.g. "100 ml", "approx 250g"
    is_qualified: bool = False          # "approx.", "about" present alongside the number


class MRPDeclaration(BaseModel):
    raw_text: Optional[str] = None              # e.g. "MRP Rs.299.00 (Incl. of all taxes)"
    value: Optional[float] = None
    has_tax_statement: bool = False             # "inclusive of all taxes" present
    all_detected_values: List[float] = Field(default_factory=list)  # for conflict detection
    font_height_mm: Optional[float] = None
    is_sticker: bool = False                    # pasted-on sticker vs printed


class DateDeclaration(BaseModel):
    manufacture_month_year: Optional[str] = None   # e.g. "08/2025"
    best_before_text: Optional[str] = None          # e.g. "30 Months from Mfg. Date"
    font_height_mm: Optional[float] = None


class ConsumerCare(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None

    def is_present(self) -> bool:
        return any([self.name, self.address, self.phone, self.email])

    def is_plausible(self) -> bool:
        """Very loose sanity check -- catches obvious placeholders like
        '1234567890' or 'test@test.com', not a full validation service."""
        if self.phone and self.phone.strip().replace(" ", "") in {"1234567890", "0000000000"}:
            return False
        if self.email and self.email.strip().lower() in {"test@test.com", "abc@abc.com"}:
            return False
        return True


class DimensionDeclaration(BaseModel):
    num_pieces: Optional[int] = None
    per_piece_dimensions: List[str] = Field(default_factory=list)  # one entry per distinct piece size


class ProductCategory(BaseModel):
    is_imported: bool = False
    is_textile_item: bool = False          # triggers Rule 14
    can_expire: bool = True                # affects best-before requirement
    is_exempt_from_mfg_date: bool = False  # bidi, certain LPG cylinders
    is_exempt_from_mrp: bool = False       # bidi, price-controlled LPG
    is_combination_or_group_pack: bool = False  # exempt from unit sale price
    is_multi_piece_count_pack: bool = False     # "1 N / 1 U / 1 set" -- exempt from unit sale price


class ExtractedDeclarations(BaseModel):
    """What the (future) OCR/extraction module hands to the rule engine."""
    manufacturer_address: Optional[str] = None
    country_of_origin: Optional[str] = None
    generic_name: Optional[str] = None
    net_quantity: NetQuantity = Field(default_factory=NetQuantity)
    mrp: MRPDeclaration = Field(default_factory=MRPDeclaration)
    mfg_date: DateDeclaration = Field(default_factory=DateDeclaration)
    consumer_care: ConsumerCare = Field(default_factory=ConsumerCare)
    dimensions: Optional[DimensionDeclaration] = None
    unit_sale_price_text: Optional[str] = None
    category: ProductCategory = Field(default_factory=ProductCategory)

    # For font-size + PDP checks (Rule 7) -- these come from the image
    # pipeline's calibration.px_per_mm + roi_detection bounding boxes once
    # wired up; hand-supplied for now.
    pdp_area_cm2: Optional[float] = None
    general_letter_height_mm: Optional[float] = None
    is_embossed_or_perforated: bool = False
    is_ecommerce_listing: bool = False


class Violation(BaseModel):
    code: ViolationCode
    severity: Severity
    field: str
    message: str


class ComplianceSummary(BaseModel):
    critical: int = 0
    major: int = 0
    minor: int = 0
    overall_status: str = "compliant"  # "compliant" | "non_compliant"


class ComplianceReport(BaseModel):
    violations: List[Violation] = Field(default_factory=list)
    summary: ComplianceSummary = Field(default_factory=ComplianceSummary)
