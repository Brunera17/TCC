from  datetime import datetime
from config import db
from sqlalchemy.orm import validates
from .base import TimestampMixin, ActiveMixin
import re

class ItemProposta(db.Model, TimestampMixin, ActiveMixin):
    """ Modelo de Item da Proposta """
    __tablename__ = 'itens_propostas'

    id = db.Column(db.Integer, primary_key=True)
    quantidade = db.Column(db.Integer, nullable=False, default=1)
    valor_unitario = db.Column(db.Float, nullable=False)
    valor_total = db.Column(db.Float, nullable=False)

    # Foreign Keys
    proposta_id = db.Column(db.Integer, db.ForeignKey('propostas.id', ondelete='CASCADE'), nullable=False, index=True)
    servico_id = db.Column(db.Integer, db.ForeignKey('servicos.id', ondelete='SET NULL'), nullable=True, index=True)

    # Relationships
    proposta = db.relationship('Proposta', back_populates='itens', lazy='joined')
    servico = db.relationship('Servico', back_populates='item_propostas', lazy='joined')

    # Validadores
    @validates('quantidade')
    def validando_quantidade(self, key, quantidade):
        if quantidade < 1:
            raise ValueError("A quantidade deve ser pelo menos 1")
        return quantidade

    @validates('valor_unitario')
    def validando_valor_unitario(self, key, valor_unitario):
        if valor_unitario < 0:
            raise ValueError("O valor unitário não pode ser negativo")
        return valor_unitario

    @validates('valor_total')
    def validando_valor_total(self, key, valor_total):
        if valor_total < 0:
            raise ValueError("O valor total não pode ser negativo")
        return valor_total
    

    def to_json(self):
        return{
            'id': self.id,
            'proposta_id': self.proposta_id,
            'servico_id': self.servico_id,
            'quantidade': self.quantidade,
            'valor_unitario': self.valor_unitario,
            'valor_total': self.valor_total,
            'ativo': self.ativo,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
        }
    def __repr__(self):
        return f"<ItemProposta {self.id}>"
    
class Proposta(db.Model, TimestampMixin, ActiveMixin):
    ''' Modelo de Proposta '''
    __tablename__ = 'propostas'
    
    id = db.Column(db.Integer, primary_key=True)
    numero_proposta = db.Column(db.String(20), nullable=False, unique=True, index=True)
    validade = db.Column(db.DateTime, nullable=True)
    observacao = db.Column(db.String(255), nullable=True)
    status = db.Column(db.String(50), default='rascunho')
    porcentagem_desconto = db.Column(db.Integer, nullable=True, default=0)
    valor_total = db.Column(db.Float, nullable=True, default=0.0)
    requer_aprovacao = db.Column(db.Boolean, default=False)
    aprovado_por = db.Column(db.String(100), nullable=True)
    data_aprovacao = db.Column(db.DateTime, nullable=True)
    motivo_rejeicao = db.Column(db.String(255), nullable=True)
    
    # Campos para PDF gerado
    pdf_gerado = db.Column(db.Boolean, default=False)
    pdf_caminho = db.Column(db.String(255), nullable=True)
    pdf_gerado_em = db.Column(db.DateTime, nullable=True)
    
    # Foreign Keys
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id', ondelete='SET NULL'), nullable=True, index=True)
    entidade_juridica_id = db.Column(db.Integer, db.ForeignKey('entidades_juridicas.id', ondelete='SET NULL'), nullable=True, index=True)
    usuario_id = db.Column(db.Integer, db.ForeignKey('funcionarios.id', ondelete='SET NULL'), nullable=True, index=True)
    
    # Relationships
    cliente = db.relationship('Cliente', back_populates='propostas', lazy='joined')
    entidade_juridica = db.relationship('EntidadeJuridica', back_populates='propostas', lazy='joined')
    usuario = db.relationship('Usuario', back_populates='propostas', lazy='joined')
    itens = db.relationship('ItemProposta', back_populates='proposta', lazy='joined', cascade="all, delete-orphan")
    
    # Validadores
    @validates('numero_proposta')
    def validando_numero_proposta(self, key, numero_proposta):
        if not numero_proposta:
            raise ValueError("O número da proposta não pode ser vazio")
        return numero_proposta
    @validates('status')
    def validando_status(self, key, status):
        status_permitidos = ['rascunho', 'enviada', 'aceita', 'rejeitada', 'expirada']
        if status not in status_permitidos:
            raise ValueError(f"O status deve ser um dos seguintes: {', '.join(status_permitidos)}")
        return status
    
    def calcular_totais(self):
        """Calcula todos os totais da proposta baseado nos itens"""
        if not self.itens:
            return {
                'subtotal': 0.0,
                'desconto_percentual': self.porcentagem_desconto or 0,
                'valor_desconto': 0.0,
                'total': 0.0,
                'quantidade_total_itens': 0
            }
        
        # Calcular subtotal somando todos os itens
        subtotal = sum(item.valor_total for item in self.itens if item.ativo)
        
        # Calcular desconto
        desconto_percentual = self.porcentagem_desconto or 0
        valor_desconto = (subtotal * desconto_percentual) / 100
        
        # Total final
        total = subtotal - valor_desconto
        
        # Quantidade total de itens
        quantidade_total = sum(item.quantidade for item in self.itens if item.ativo)
        
        # Atualizar valor_total no modelo se necessário
        if self.valor_total != total:
            self.valor_total = total
        
        return {
            'subtotal': round(subtotal, 2),
            'desconto_percentual': desconto_percentual,
            'valor_desconto': round(valor_desconto, 2),
            'total': round(total, 2),
            'quantidade_total_itens': quantidade_total,
            'valor_unitario_medio': round(subtotal / quantidade_total, 2) if quantidade_total > 0 else 0.0
        }
    
    def validar_proposta(self):
        """Valida se a proposta está completa e correta"""
        erros = []
        avisos = []
        
        # Validações obrigatórias
        if not self.numero_proposta:
            erros.append("Número da proposta é obrigatório")
        
        if not self.cliente_id and not self.entidade_juridica_id:
            erros.append("Cliente ou Entidade Jurídica deve ser informado")
        
        if not self.itens or len([item for item in self.itens if item.ativo]) == 0:
            erros.append("Proposta deve ter pelo menos um item")
        
        # Validações de negócio
        if self.validade and self.validade < datetime.now():
            avisos.append("Proposta com validade expirada")
        
        if self.porcentagem_desconto and self.porcentagem_desconto > 50:
            avisos.append("Desconto superior a 50% - pode requerer aprovação")
        
        # Validar itens
        for item in self.itens:
            if item.ativo:
                if item.quantidade <= 0:
                    erros.append(f"Item {item.id}: quantidade deve ser positiva")
                if item.valor_unitario <= 0:
                    erros.append(f"Item {item.id}: valor unitário deve ser positivo")
                if item.valor_total != (item.quantidade * item.valor_unitario):
                    avisos.append(f"Item {item.id}: valor total inconsistente")
        
        # Verificar se requer aprovação
        totais = self.calcular_totais()
        if totais['total'] > 10000:  # Valores altos podem requerer aprovação
            if not self.requer_aprovacao:
                avisos.append("Proposta de valor alto - considere marcar como 'requer aprovação'")
        
        return {
            'valida': len(erros) == 0,
            'erros': erros,
            'avisos': avisos,
            'observacoes': f"{len(erros)} erro(s), {len(avisos)} aviso(s)"
        }
    
    def atualizar_status_pdf(self, caminho_arquivo: str, sucesso: bool = True):
        """Atualiza o status de geração do PDF"""
        self.pdf_gerado = sucesso
        if caminho_arquivo and sucesso:
            self.pdf_caminho = caminho_arquivo
        if sucesso:
            self.pdf_gerado_em = datetime.now()
        
        # Salvar será feito pelo chamador para controlar transação
    def to_json(self):
        return{
            'id': self.id,
            'numero_proposta': self.numero_proposta,
            'validade': self.validade.isoformat() if self.validade else None,
            'observacao': self.observacao,
            'status': self.status,
            'porcentagem_desconto': self.porcentagem_desconto,
            'valor_total': self.valor_total,
            'requer_aprovacao': self.requer_aprovacao,
            'aprovado_por': self.aprovado_por,
            'data_aprovacao': self.data_aprovacao.isoformat() if self.data_aprovacao else None,
            'motivo_rejeicao': self.motivo_rejeicao,
            'pdf_gerado': self.pdf_gerado,
            'pdf_caminho': self.pdf_caminho,
            'pdf_gerado_em': self.pdf_gerado_em.isoformat() if self.pdf_gerado_em else None,
            'cliente': self.cliente.to_json() if self.cliente else None,
            'entidade_juridica': self.entidade_juridica.to_json() if self.entidade_juridica else None,
            'usuario': self.usuario.to_json() if self.usuario else None,
            'itens': [item.to_json() for item in self.itens],
            'ativo': self.ativo,
            'created_at': self.created_at.isoformat(),
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
            'updated_at': self.updated_at.isoformat(),
        }
    def __repr__(self):
        return f"<Proposta {self.numero_proposta}>"
    