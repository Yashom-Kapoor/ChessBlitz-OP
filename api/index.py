import sys
import os

# Add the backend directory to the Python path
backend_path = os.path.join(os.path.dirname(__file__), '..', 'backend', 'src')
sys.path.insert(0, os.path.abspath(backend_path))

from backend.app import app

# Vercel serverless function handler
def handler(request):
    """
    Vercel Python runtime handler for Flask app.
    This wraps the Flask WSGI application for Vercel's serverless runtime.
    """
    # Build WSGI environ from Vercel request object
    # Vercel provides request.path, request.method, request.headers, request.body
    path = request.path if hasattr(request, 'path') else '/'
    method = request.method if hasattr(request, 'method') else 'GET'
    headers = request.headers if hasattr(request, 'headers') else {}
    body = request.body if hasattr(request, 'body') else b''
    
    # Build WSGI environ
    environ = {
        'REQUEST_METHOD': method,
        'PATH_INFO': path,
        'SCRIPT_NAME': '',
        'QUERY_STRING': request.query_string if hasattr(request, 'query_string') else '',
        'CONTENT_TYPE': headers.get('Content-Type', ''),
        'CONTENT_LENGTH': str(len(body)) if body else '',
        'SERVER_NAME': headers.get('Host', 'localhost').split(':')[0],
        'SERVER_PORT': headers.get('Host', 'localhost').split(':')[1] if ':' in headers.get('Host', 'localhost') else '80',
        'wsgi.version': (1, 0),
        'wsgi.url_scheme': headers.get('X-Forwarded-Proto', 'https'),
        'wsgi.input': body if isinstance(body, (bytes, str)) else None,
        'wsgi.errors': sys.stderr,
        'wsgi.multithread': False,
        'wsgi.multiprocess': True,
        'wsgi.run_once': False,
    }
    
    # Add all headers to environ with HTTP_ prefix (WSGI standard)
    for key, value in headers.items():
        environ_key = f'HTTP_{key.replace("-", "_").upper()}'
        environ[environ_key] = value
    
    # Response storage
    response_status = [None]
    response_headers = []
    
    def start_response(status, headers):
        response_status[0] = status
        response_headers.extend(headers)
    
    # Call Flask app (WSGI application)
    response_body = list(app(environ, start_response))
    
    # Extract status code
    status_code = int(response_status[0].split()[0]) if response_status[0] else 200
    
    # Convert headers to dict (handle case-insensitive keys)
    headers_dict = {}
    for key, value in response_headers:
        # Use lowercase for consistency
        headers_dict[key.lower()] = value
    
    # Combine response body
    if response_body:
        if isinstance(response_body[0], bytes):
            body = b''.join(response_body).decode('utf-8')
        else:
            body = ''.join(str(b) for b in response_body)
    else:
        body = ''
    
    # Return response in Vercel format
    return {
        'statusCode': status_code,
        'headers': headers_dict,
        'body': body
    }
