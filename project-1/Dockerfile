# Use a slim version of Python to keep the image small and secure
FROM python:3.11-slim

# Set the working directory inside the container
WORKDIR /app

# Copy only requirements first (this makes builds faster!)
COPY requirements.txt .

# Install the frozen dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your code (app.py, templates, etc.)
COPY . .

# Expose the port Flask uses
EXPOSE 5000

# Start the application
CMD ["python", "app.py"]

CMD ["python", "-m", "flask", "run", "--host=0.0.0.0", "--port=5000"]
