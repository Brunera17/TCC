from config import app, db
from controllers import register_controllers

# Registra todos os controllers
register_controllers(app)

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
    app.run(debug=True, port=9000, host='127.0.0.1')
