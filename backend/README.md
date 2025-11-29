# MedHere Backend

- Navigate to backend directory

  `cd backend`

- Set the Gemini API Key (ask a developer for the API key or create your own)

  `echo "GEMINI_API_KEY=api_key_here" > .env`

- Install required packages

  `pip install -r requirements.txt`

- If previous command fails, try the following command

  `python -m pip install --user --break-system-packages -r requirements.txt`

- Once the requirements have successfully been installed, run the backend

  `python backend.py`

- The application should be running now, check the terminal for URL 

  `http://127.0.0.1:5001`