import json
import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()

def get_interactions_from_llm(drug_list):
    """
    Sends a list of drug names to the Gemini API and asks for
    a JSON response detailing any interactions.
    """
    
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("--- ERROR ---")
        print("GEMINI_API_KEY not found in your .env file.")
        print("Please create a .env file and add: GEMINI_API_KEY=YOUR_KEY_HERE")
        return None
    
    try:
        genai.configure(api_key=api_key)
    except Exception as e:
        print(f"Error configuring Google AI: {e}")
        return None

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
        print("\n--- Calling Google AI for interaction analysis... ---")
        response = model.generate_content(prompt)
        
        response_text = response.parts[0].text
        interaction_data = json.loads(response_text)
        return interaction_data

    except Exception as e:
        print(f"Error calling the Generative AI API: {e}")
        try:
            print("\n--- Raw Model Response (for debugging): ---")
            print(response.text)
        except:
            pass
        return None

def find_drug_interactions(file_path='patient.json'):
    """
    Reads a FHIR JSON file, extracts prescribed medication names,
    and checks for drug-drug interactions using an LLM.
    """
    print(f"--- Reading patient data from {file_path} ---")

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            fhir_bundle = json.load(f)
    except FileNotFoundError:
        print(f"Error: The file '{file_path}' was not found.")
        return
    except json.JSONDecodeError:
        print(f"Error: The file '{file_path}' is not a valid JSON file.")
        return

    drug_names = set()

    for entry in fhir_bundle.get('entry', []):
        resource = entry.get('resource', {})

        if resource.get('resourceType') == 'MedicationRequest':
            med_text = resource.get('medicationCodeableConcept', {}).get('text')
            if med_text:
                drug_names.add(med_text)

    if not drug_names:
        print("No medication names found in the patient file.")
        return

    drug_list = list(drug_names)
    print(f"Found {len(drug_list)} unique medication(s): {drug_list}")

    if len(drug_list) < 2:
        print("Not enough medications found to check for interactions.")
        return

    interaction_data = get_interactions_from_llm(drug_list)

    if not interaction_data:
        print("Could not retrieve interaction data.")
        return

    interactions = interaction_data.get('interactions')

    if not interactions:
        print("\n--- Result: No clinically significant drug interactions found. ---")
        return

    print("\n--- Found Potential Drug Interactions: ---")
    
    for interaction in interactions:
        drug_pair = " and ".join(interaction.get('drugs', ['Unknown', 'Unknown']))
        severity = interaction.get('severity', 'Unknown')
        description = interaction.get('description', 'No description provided.')

        print(f"\nInteraction between: {drug_pair}")
        print(f"  Severity: {severity.capitalize()}")
        print(f"  Description: {description}")

if __name__ == '__main__':
    find_drug_interactions('patient.json')