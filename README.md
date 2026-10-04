# CloudMedBio — ECG Analysis

A complete starter implementation of the ECG analysis interface shown in the reference image.

## Stack

### Frontend
- React
- TypeScript
- Vite
- Lucide React
- SVG ECG chart

### Backend
- Python
- FastAPI
- Uvicorn
- CSV processing
- Educational peak detection and heart-rate estimation

## Project structure

```text
cloudmedbio_ecg_project/
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── styles.css
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── backend/
│   ├── main.py
│   └── requirements.txt
├── sample_data/
│   └── sample_ecg.csv
└── README.md
```

## Run the backend

Open a terminal in `backend`:

```powershell
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

Backend health check:

```text
http://127.0.0.1:8000/api/health
```

## Run the frontend

Open another terminal in `frontend`:

```powershell
npm install
npm run dev
```

Then open:

```text
http://127.0.0.1:5174/
```

## Test

1. Start the backend.
2. Start the frontend.
3. Click **Load sample**.
4. The ECG waveform and metrics should appear.
5. Or choose `sample_data/sample_ecg.csv`.

## API endpoints

- `GET /api/health`
- `GET /api/sample`
- `POST /api/analyze` with a CSV file

## Deploy the frontend to GitHub Pages

The GitHub Actions workflow in `.github/workflows/deploy-pages.yml` builds and
publishes the frontend whenever changes are pushed to `main`. Create a **public**
GitHub repository named `cloudmedbio-ecg-project`, push this project to its
`main` branch, then enable **Settings → Pages → Build and deployment → GitHub
Actions**. The published site will be
`https://manaswi18.github.io/cloudmedbio-ecg-project/`.

GitHub Pages hosts only static frontend files. Protein sequence estimates run in
the browser. ECG upload and sample analysis require the separate API deployment
and will not work from the Pages site until an HTTPS API URL is configured.

## Deploy to AWS

The frontend has also been published to AWS Amplify. The FastAPI API is running
separately in AWS Elastic Beanstalk. AWS resources may incur charges; review
current pricing and remove resources when no longer needed. Protein sequence
estimates currently run in the browser and do not call a cloud folding model.

### Prerequisites

- An activated AWS account with permission to use AWS Amplify and AWS Lambda.

### Deploy an HTTPS API through Lambda (no Docker)

Create a Lambda ZIP package with the Python 3.12 Linux dependencies, `main.py`,
and `lambda_handler.py`. In the AWS Console, open **Lambda → Create function**:

1. Create an author-from-scratch function using the Python 3.12 runtime.
2. Upload the ZIP package and set the handler to `lambda_handler.handler`.
3. Set environment property `CORS_ORIGINS` to the Amplify app's HTTPS origin.
4. Create a Function URL with `NONE` authentication and allow that Amplify
   origin in Function URL CORS settings.
5. The API health check is `<function-url>/api/health`.

### Deploy a frontend ZIP through Amplify Hosting

In **AWS Amplify → Create new app → Deploy without Git provider**, upload a ZIP
of the built frontend files. Build it from `frontend`, setting `VITE_API_BASE_URL`
to the Lambda Function URL:

```powershell
$env:VITE_API_BASE_URL = "https://<your-function-url>"
npm run build
```

After deployment, copy the Amplify HTTPS URL and allow it in both the Lambda
Function URL CORS configuration and the `CORS_ORIGINS` environment property.

The ECG analysis and sequence-property estimates are educational demonstrations,
not clinical or research-grade structure predictions.

## Important medical note

This is an educational/research demonstration. The ECG processing and metrics are not a clinical diagnostic system or medical device. Do not use the output to make medical decisions.
