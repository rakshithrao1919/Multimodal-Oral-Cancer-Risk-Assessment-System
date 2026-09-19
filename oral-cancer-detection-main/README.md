# Multimodal Oral Cancer Risk Assessment System

A full-stack clinical decision support prototype combining deep learning vision models, tabular genomic/clinical classifiers, attention-based fusion, and Gemini-powered explainability for early oral squamous cell carcinoma (OSCC) risk assessment.

---

## Key Features

- **👥 Patient Management**:
  - ChatGPT-style collapsible left sidebar for browsing and searching patients.
  - Quick patient registration modal (Name, Age, Gender, Phone) with validation.
  - Dedicated patient profiles showing visit frequency and latest risk status.

- **📋 Patient History & Timeline**:
  - Persistent consultation and scan history linked to each patient.
  - Interactive timeline showing historical risk progression over time.
  - One-click access to reload and review any previous scan and report.

- **📊 Risk Analytics**:
  - Interactive risk gauge displaying overall malignancy probability (Low / Moderate / High).
  - Model consensus bar chart comparing predictions across multimodal classifiers (Histopathology, Intra-oral, Clinical, Genomic).
  - Longitudinal risk progression trendline tracking patient status across visits.

- **🧠 AI Explainability (XAI)**:
  - Attention distribution radar chart displaying modality fusion weights.
  - Feature dependency breakdown highlighting critical risk drivers.
  - Gemini-powered natural language clinical insight and follow-up recommendations.

- **📄 Medical Reports**:
  - Clean, clinical diagnostic summary report.
  - Instant **Print / Save as PDF** support for electronic health records (EHR).

---

## Architecture

### Frontend
- **Framework**: React 19 + Vite
- **Routing**: React Router
- **Styling**: Vanilla CSS with modern dark glassmorphism design system
- **State & Auth**: Supabase JS client with local demo fallback mode

### Backend
- **Framework**: FastAPI (Python 3.10+)
- **Database / Auth**: Supabase (PostgreSQL + PostgREST + Auth)
- **ML / Deep Learning**: PyTorch, torchvision, scikit-learn, LightGBM, joblib
- **Generative AI / XAI**: Google Gemini API for clinical insights & multimodal vision inference

---

## API Endpoints

### Predictions (`/api/v1/predict`)
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/schema` | Retrieve expected tabular feature schema |
| `POST` | `/` | Run prediction on 103-feature tabular vector |
| `POST` | `/multimodal` | Multipart upload for images & reports linked to a patient |
| `GET` | `/history/{patient_id}` | Fetch all past predictions for a specific patient |

### Patients (`/api/v1/patients`)
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/` | Create a new patient record |
| `GET` | `/` | List all patients for the authenticated doctor |
| `GET` | `/{patient_id}` | Retrieve patient detail with full prediction history |
| `DELETE` | `/{patient_id}` | Delete patient and cascade-delete linked predictions |

---

## Database Setup (Supabase)

Before running the application with persistent storage, execute the migration script in your **Supabase Dashboard → SQL Editor**:

The migration file is located at `backend/supabase_migration.sql`. It creates:
- `patients` table with doctor linkage, metadata, and indexes.
- `predictions` table storing risk scores, attention weights, model outputs, and clinical insights.
- Row Level Security (RLS) policies allowing backend API access.

---

## Getting Started

### Prerequisites
- Python 3.10 or higher
- Node.js 18 or higher & npm

### 1. Backend Setup

```bash
cd backend

# Create and activate a virtual environment
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
source .venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

Configure environment variables in `backend/.env`:
```env
PROJECT_NAME=Oral Cancer Multimodal AI System
API_V1_STR=/api/v1
SUPABASE_URL=https://<your-project-ref>.supabase.co
SUPABASE_KEY=<your-supabase-anon-or-service-key>
GEMINI_API_KEY=<your-google-gemini-api-key>
BACKEND_CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"]
```

Run the backend server:
```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install
```

Configure environment variables in `frontend/.env`:
```env
VITE_SUPABASE_URL=https://<your-project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
VITE_API_URL=http://127.0.0.1:8000/api/v1
```

Start the Vite development server:
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## Testing

### Backend
```bash
cd backend
pytest
```

### Frontend
```bash
cd frontend
npm run lint
npm run build
```

---

## Inference & Fallback Notes

- **Missing Vision Checkpoints**: If PyTorch model weights are not loaded locally, multimodal inputs route directly to Gemini Vision for zero-shot clinical analysis.
- **Fusion Fallback**: If trained fusion checkpoints are absent, the system applies a deterministic weighted ensemble average.
- **Demo Mode**: If Supabase credentials are not provided, the frontend falls back to demo authentication (`demo@doctor.com` / `password`).
- **Gemini Fallback**: If `GEMINI_API_KEY` is not present, deterministic local diagnostic text is generated based on model risk scores.

