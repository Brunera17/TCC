from config import app
from models.proposta import Proposta
from services.proposta_services import PropostaService
import json

with app.app_context():
    p = Proposta.query.first()
    if not p:
        print('NO_PROPOSTA')
    else:
        print(f'PROPOSTA_ID:{p.id}')
        svc = PropostaService()
        logs = svc.get_logs(p.id)
        out = []
        for l in logs:
            if hasattr(l, 'to_json'):
                out.append(l.to_json())
            else:
                try:
                    out.append({k: v for k, v in vars(l).items() if not k.startswith('_')})
                except Exception:
                    out.append(str(l))
        print(json.dumps(out, ensure_ascii=False, indent=2))
