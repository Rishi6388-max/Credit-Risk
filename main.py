
from fastapi import FastAPI
from pydantic import BaseModel
import pandas as pd
import joblib
from contextlib import asynccontextmanager
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pathlib import Path

ml_model = {}  #dictionary to store the model

@asynccontextmanager
async def lifespan(app: FastAPI):
    ml_model['model'] = joblib.load("credit_risk_model.pkl")
    ml_model['threshold'] = joblib.load('best_threshold.pkl')

    yield #it is used to stop the model when server is stop

    ml_model.clear() #model will be cleared when the server is stopped

app = FastAPI(lifespan=lifespan)  #lifespan is used to load the model when the server is started and clear the model when the server is stopped



#the only columns that user  will see and provide inputs
class LoanApplication(BaseModel): #pydantic model it ensures that the data is validated and structured correctly
    person_age : int
    person_income : float
    person_home_ownership: str
    person_emp_length: float
    loan_intent: str
    loan_grade : str
    loan_amnt : float
    loan_int_rate : float
    loan_percent_income : float
    cb_person_default_on_file: str
    cb_person_cred_hist_length : int

@app.get("/")
def greet():
    return FileResponse(Path(__file__).parent / "static" / "index.html")

@app.post("/predict")  #this we called route of post method
def predict(data : LoanApplication):  #data is the object and loan application is the class
    input_df = pd.DataFrame([data.dict()])  #convert the data to a dataframe

    probability = float(ml_model['model'].predict_proba(input_df)[:,1][0])  #predict the output using the model

    threshold = float(ml_model['threshold'])
    prediction = int(probability >= threshold)  #if the prediction is greater than the threshold then it is a good loan otherwise it is a bad loan
    return{

        "probability": probability,
        "prediction": prediction,
        "thresold": threshold,
        "Result": "High Risk" if prediction == 1 else "Low Risk"
     }
app.mount("/static", StaticFiles(directory=Path(__file__).parent / "static"), name="static")  #this is used to serve the static files like images, css, js etc.