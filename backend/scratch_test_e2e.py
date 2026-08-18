import httpx

client = httpx.Client(base_url='http://127.0.0.1:8000/api/v1')

# 1. Login
res = client.post('/auth/login', json={'email': 'mahadeb@example.com', 'password': 'password123'})
assert res.status_code == 200, f'Login failed: {res.text}'
token = res.json()['access_token']
headers = {'Authorization': f'Bearer {token}'}
print('[+] Auth Login Success: Token generated')

# 2. Get Groups
res = client.get('/groups/', headers=headers)
assert res.status_code == 200
groups = res.json()
assert len(groups) > 0
group = groups[0]
group_id = group['id']
print(f"[+] Fetched Group: {group['name']} (Type: {group['group_type']})")

# 3. Calculate Balances & Debt Simplification
res = client.get(f'/groups/{group_id}/balances', headers=headers)
assert res.status_code == 200
balances = res.json()
print(f"[+] Calculated Mess Balances: Meal Rate = Rs {balances['meal_rate']}/meal, Total Meals = {balances['total_meals']}")
print(f"[+] Simplified Transactions: {len(balances['simplified_settlements'])} payouts recommended")
for tx in balances['simplified_settlements']:
    print(f"    -> {tx['payer_name']} -> {tx['payee_name']}: Rs {tx['amount']} (UPI: {tx['payee_upi_id']})")
    assert tx['upi_uri'] is not None

# 4. Generate PDF Report
res = client.get(f'/reports/{group_id}/pdf', headers=headers)
assert res.status_code == 200
assert res.headers['content-type'] == 'application/pdf'
assert len(res.content) > 1000
print(f"[+] PDF Report Generated Successfully! Size: {len(res.content)} bytes")

print("[SUCCESS] All Full-Stack API Integration flows passed flawlessly!")
