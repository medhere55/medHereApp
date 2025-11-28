"""
WSGI entry point for production deployment with Gunicorn
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))

from backend import app

application = app

