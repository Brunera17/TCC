from flask import jsonify
from typing import Dict, List, Optional, Any, Tuple

def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> Optional[Tuple[Dict, int]]:
    """Valida campos obrigatórios"""
    missing = [field for field in required_fields if not data.get(field)]
    if missing:
        return jsonify({'error': f'Campos obrigatórios faltando: {", ".join(missing)}'}), 400
    return None
