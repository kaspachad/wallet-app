# Kaspa Wallet App – Roadmap

This app is a full-stack Kaspa wallet management system with user roles, wallet creation, token support, and future plans for NFTs, KNS, and more. Each user has their own wallet daemon. Admins can mint tokens and manage users.

---

## 🔄 Wallet Features

- [x] Create wallet and store daemon port
- [x] Show wallet address and KAS balance
- [ ] Add wallet transaction history view
- [ ] Add QR code display for wallet address
- [ ] Add “Send” screen for KRC20 tokens
- [ ] Refresh wallet balances with icon + tooltip + loading spinner
- [ ] Support multiple KRC20 tokens and show balances
- [ ] Fetch USD value of KAS and display next to balance
- [ ] Add wallet restore from seed flow
- [ ] Add backup wallet file download

---

## 🔐 Security & Daemon

- [x] Tie wallet to user and store in DB
- [ ] Encrypt wallet seed using login password
- [ ] Limit 1 wallet per user (enforced in DB + UI)
- [ ] Kill orphan wallet daemons on logout or server crash
- [ ] Auto-assign new daemon port during wallet creation
- [ ] Hide/show seed phrase only once

---

## 🛠️ Admin Tools

- [x] Role-based dashboard (admin/supervisor/employee)
- [ ] Mint new KRC20 token (admin only)
- [ ] Distribute tokens via CSV upload
- [ ] Lock token minting after deployment with “All Set” button
- [ ] Bulk create wallets for employees via email CSV
- [ ] Add user management panel (view, disable, reset password)

---

## 🧭 Navigation & UX

- [x] Tab-based dashboard layout
- [ ] Redirect to `login.html` if user not authenticated
- [ ] Collapse/expand sidebar menu for mobile
- [ ] Show/hide menu options based on role
- [ ] Add “Voting” and “Union” tabs for future modules

---

## 💅 UI Polish

- [x] Kaspa color scheme styling
- [ ] Add loading spinner when refreshing balances
- [ ] Add tooltip on balance hover (`≈ $X.XX`)
- [ ] Improve layout responsiveness on small screens
- [ ] Add dark/light mode toggle using Kaspa theme

---

## 🧪 Testing & Dev Tools

- [ ] Add testnet/faucet support
- [ ] Add logging for wallet events (send, receive, mint)
- [ ] Mock wallet actions for demo mode
- [ ] Debug tab for admins with live wallet JSON

---

## 🎁 Extras & Just for Fun

- [ ] Add support for KNS address resolution (e.g. `johnny.kaspa`)
- [ ] Add NFT gallery tab to show owned NFTs
- [ ] Add “canvas” to write & sign messages (manual Kaspa signing)

