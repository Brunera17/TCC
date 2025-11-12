from config import db
from models.notificacao import Notificacao

class NotificacaoRepository:
    def get_by_id(self, notificacao_id: int):
        return Notificacao.query.filter_by(id=notificacao_id, ativo=True).first()

    def marcar_lida(self, notificacao_id: int):
        notificacao = self.get_by_id(notificacao_id)
        if notificacao:
            notificacao.marcar_lida()
            db.session.commit()
        return notificacao