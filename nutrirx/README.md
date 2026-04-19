# NutriRx

NutriRx is a full-stack web application designed to generate personalized clinical nutrition targets and meal plans based on a patient's health parameters, dietary preferences, and budget constraints (e.g., SNAP, WIC). It leverages the power of Google's Gemini models to tailor these meal plans and provides a feature to grade grocery receipts against the generated plans.

## Features

- **Personalized Meal Plans:** Generates nutrition targets and meal plans using patient data such as age, conditions (A1C, Blood Pressure), and budget constraints.
- **Receipt Grading:** Upload a grocery receipt to be parsed via Google Cloud Vision and graded by Gemini to check adherence to the planned grocery list.
- **Robust Backend:** FastAPI with an asynchronous SQLite database for fast and reliable data handling.

## Tech Stack

**Frontend:**
- [Next.js](https://nextjs.org/) (React 19)
- [Tailwind CSS](https://tailwindcss.com/)
- [Framer Motion](https://www.framer.com/motion/)
- Radix UI Primitives (Accessible UI Components)
- Recharts

**Backend:**
- [FastAPI](https://fastapi.tiangolo.com/)
- Python 3.9+
- [Google Gemini API](https://ai.google.dev/) (`gemini-1.5-flash` / `gemini-1.5-pro`)
- [Google Cloud Vision API](https://cloud.google.com/vision) (for OCR)
- `aiosqlite` (Async SQLite database)

---

## Getting Started

### Prerequisites

You need the following installed on your machine:
- **Node.js** (v18+ recommended)
- **Python** (v3.9+ recommended)

### 1. Backend Setup

Open a terminal and navigate to the backend directory:

```bash
cd nutrirx/backend
```

**Create and activate a virtual environment (Recommended):**
```bash
# Windows
python -m venv .venv
.\.venv\Scripts\activate

# macOS / Linux
python3 -m venv .venv
source .venv/bin/activate
```

**Install dependencies:**
```bash
pip install -r requirements.txt
```

**Configure Environment Variables:**
Duplicate the `.env.example` file and rename it to `.env`. Fill in the necessary API keys:

```bash
GEMINI_API_KEY=your_gemini_api_key
GEMINI_FLASH_MODEL=gemini-1.5-flash
GEMINI_PRO_MODEL=gemini-1.5-pro
USDA_API_KEY=your_usda_fdc_api_key
GOOGLE_CLOUD_VISION_CREDENTIALS=path_to_YOUR_service_account_file.json
UNSPLASH_ACCESS_KEY=your_unsplash_key
DATABASE_URL=sqlite+aiosqlite:///./nutrirx.db
FRONTEND_URL=http://localhost:3000
```

**Run the Backend Server:**
```bash
uvicorn main:app --reload
```
The API will be available at [http://localhost:8000](http://localhost:8000). You can view the swagger documentation at [http://localhost:8000/docs](http://localhost:8000/docs).


### 2. Frontend Setup

Open a **new terminal window** and navigate to the project root (where `package.json` is located):

```bash
cd nutrirx
```

**Install Node dependencies:**
```bash
npm install
```

**Run the Development Server:**
```bash
npm run dev
```