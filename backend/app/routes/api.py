from flask import request, jsonify
from app.utils.decorators import handle_api_errors
from app.utils.validators import validate_required_fields
from app.utils.pagination import paginate_query
from app.utils.filters import build_search_filters
from app.models import Funcionario


