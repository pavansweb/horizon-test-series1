#!/usr/bin/env python3
import os
from app import app

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting HORIZON TEST SERIES Portal at: http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
