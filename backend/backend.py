
import json
import os
import google.generativeai as genai
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

# Load .env file from the same directory as this file (for local dev)
# In prod, environment variables should be set via Render
env_path = os.path.join(os.path.dirname(__file__), '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

@app.route('/')
def health_check():
    """Health check endpoint for Render"""
    return jsonify({"status": "healthy", "service": "medhere-backend"}), 200

@app.route('/api/health')
def api_health():
    """API health check endpoint"""
    return jsonify({"status": "healthy", "message": "Backend API is running"}), 200

def get_interactions_from_llm(drug_list):
    """
    Sends a list of drug names to the Gemini API and asks for
    a JSON response detailing any interactions.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return {"error": "GEMINI_API_KEY environment variable not found."}

    try:
        genai.configure(api_key=api_key)
    except Exception as e:
        return {"error": f"Error configuring Google AI: {e}"}

    config = genai.GenerationConfig(response_mime_type="application/json")
    model = genai.GenerativeModel('gemini-2.0-flash', generation_config=config)

    drug_list_str = json.dumps(drug_list)

    prompt = f"""
    You are an expert pharmacological assistant. Your task is to analyze a list of drugs
    for potential drug-drug interactions.

    Here is the list of medications:
    {drug_list_str}

    Please analyze this list for any clinically significant interactions between any
    combination of the drugs.

    Your response MUST be a JSON object only, with no other explanatory text.
    The JSON object must follow this format:
    {{
     "interactions": [
       {{
         "drugs": ["Drug Name A", "Drug Name B"],
         "severity": "high" | "moderate" | "low",
         "description": "A clear, one-sentence description of the interaction."
       }}
     ]
    }}

    If no clinically significant interactions are found, return an object with an
    empty 'interactions' list:
    {{
     "interactions": []
    }}
    """

    try:
        response = model.generate_content(prompt)
        response_text = response.parts[0].text
        interaction_data = json.loads(response_text)
        return interaction_data
    except Exception as e:
        # It's good practice to log the full error for debugging
        print(f"Error calling the Generative AI API: {e}")
        # Return a user-friendly error in the response
        return {"error": "Failed to get interaction data from the AI model."}

@app.route('/api/check-interactions', methods=['POST'])
def check_interactions():
    data = request.get_json()
    if not data or 'medications' not in data:
        return jsonify({"error": "Invalid request body. 'medications' key is required."}), 400

    medications = data['medications']
    if not isinstance(medications, list) or len(medications) < 2:
        return jsonify({"interactions": []}) # Not enough drugs to compare

    interaction_data = get_interactions_from_llm(medications)

    if 'error' in interaction_data:
        return jsonify(interaction_data), 500

    return jsonify(interaction_data)

if __name__ == '__main__':
    # Using port 5001 to avoid potential conflicts with other services
    app.run(debug=True, port=5001)
