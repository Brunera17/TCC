def paginate_query(query, page: int = 1, per_page: int = 20, max_per_page: int = 100):
    """Paginação padronizada para queries"""
    per_page = min(per_page, max_per_page)
    return query.paginate(page=page, per_page=per_page, error_out=False)

