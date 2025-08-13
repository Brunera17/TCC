from typing import List

def build_search_filters(model, search_term: str, search_fields: List[str]):
    """Constrói filtros de busca dinamicamente"""
    if not search_term:
        return []
    filters = []
    for field in search_fields:
        if hasattr(model, field):
            attr = getattr(model, field)
            filters.append(attr.ilike(f'%{search_term}%'))
    return filters
