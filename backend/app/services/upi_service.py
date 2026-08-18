import urllib.parse
import qrcode
import io
import base64
from typing import Optional, Dict

def generate_upi_uri(
    upi_id: str,
    payee_name: str,
    amount: float,
    transaction_note: str = "Hostel/Mess Expense Settlement",
    currency: str = "INR"
) -> str:
    """
    Builds a standard NPCI UPI payment deep-link URI:
    upi://pay?pa=<upi_id>&pn=<name>&am=<amount>&cu=INR&tn=<note>
    """
    params = {
        "pa": upi_id,
        "pn": payee_name,
        "am": f"{amount:.2f}",
        "cu": currency,
        "tn": transaction_note
    }
    query_string = urllib.parse.urlencode(params)
    return f"upi://pay?{query_string}"

def generate_upi_qr_code(upi_uri: str) -> str:
    """
    Generates a PNG QR code for the UPI URI and returns it as a Base64 Data URL.
    """
    try:
        qr = qrcode.QRCode(
            version=1,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=8,
            border=2,
        )
        qr.add_data(upi_uri)
        qr.make(fit=True)

        img = qr.make_image(fill_color="#1e293b", back_color="#ffffff")
        buffered = io.BytesIO()
        img.save(buffered, format="PNG")
        img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")
        return f"data:image/png;base64,{img_str}"
    except Exception:
        return ""

def get_upi_payment_payload(
    upi_id: Optional[str],
    payee_name: str,
    amount: float,
    note: str = "Mess Settlement"
) -> Dict[str, Optional[str]]:
    """Helper that returns both UPI URI and QR code base64."""
    if not upi_id:
        return {"upi_uri": None, "upi_qr_base64": None}
    
    uri = generate_upi_uri(upi_id, payee_name, amount, note)
    qr_b64 = generate_upi_qr_code(uri)
    return {"upi_uri": uri, "upi_qr_base64": qr_b64}
