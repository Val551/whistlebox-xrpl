1) Main goal
Build a “glass box” funding system for investigative journalism where donors can contribute pseudonymously, funds are locked on XRPL escrow, and money only releases after verification.
2) Final result I want
A working web app on XRPL Testnet/Devnet with:
a public campaign page showing total raised, locked, and released


real donations that automatically create XRPL escrows


a verifier button that triggers escrow release to the journalist


links to the actual XRPL transactions for audit


3) What success looks like
In a live demo I can:
donate test XRP,


show the escrow on XRPL (“funds locked”),


approve as verifier,


show funds move to the journalist wallet (“box opened”),


everyone can see where money went, without any donor identities collected.


4) What I should avoid
claiming “perfect anonymity” (say pseudonymous)


building a generic wallet or DeFi dashboard


relying on mock transactions (must be real XRPL testnet txs)


over-scoping into identity, advanced cryptography, or full governance voting
