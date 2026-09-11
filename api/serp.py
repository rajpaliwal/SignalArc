import requests
import os, json

SERP_API_KEY = os.getenv("SERP_API_KEY")

headers = {
    "Authorization": f"Bearer {SERP_API_KEY}",
    "Content-Type": "application/json"
}
data = {
    "zone": "signal_arc",
    "url": "https://www.google.com/search?q=pizza",
    "format": "json",
    "data_format": "parsed_light"
}

response = requests.post(
    "https://api.brightdata.com/request",
    json=data,
    headers=headers
)

data = response.json()['body']
results = json.dumps(data)
# print(results.keys())
print(type(results), results)