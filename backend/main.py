from config import app, db
from views import api
from models import Funcionario

# Registra o blueprint depois de importar
app.register_blueprint(api)

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        f = Funcionario.query.first()
        print(f)
    app.run(debug=True, port=5000)
