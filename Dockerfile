# Use Python 3.9
FROM python:3.9

# Set the working directory
WORKDIR /code

# Copy the requirements file from root
COPY requirements.txt /code/requirements.txt

# Install dependencies
RUN pip install --no-cache-dir --upgrade -r /code/requirements.txt

# Copy the backend code
COPY ./backend /code/app

# Hugging Face expects port 7860. This is crucial.
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
