from app.main import handler


def test_handler():
    assert handler()["ok"] is True
