# Cloud worker

Build from the repository root with `docker build -f integrations/imessage/cloud/Dockerfile .`.
Run one always-on instance with automatic restart on failure. It does not expose an HTTP port.
Only explicit source files enter the image; local environment files and admin scripts are excluded.

Set secret environment variables in the hosting dashboard:

- `PROJECT_ID`: `c3b111c1-1414-477e-bcf1-d09eeab35e70`
- `PROJECT_SECRET`: the existing Photon project credential, entered by the account owner.
- `MARCO_IMESSAGE_BRIDGE_KEY`: the purpose-scoped value from `bridgeKey()` in the protocol module, derived securely from the server's existing service-role key. Never put the service-role key itself in cloud worker configuration.

Keep the same Photon project so the dedicated number and existing account connections remain valid.
Do not start multiple replicas. Stop the local worker immediately before activating cloud consumption,
then confirm startup and test a DM, a group link, and a second person's heart. On failure, stop the
cloud instance before restarting the local worker. Disable overlapping deploys where supported.

## Recovery limits

The pinned SDK reconnects and fetches missed events using an in-memory cursor during transient
connection failures. The cursor does not survive process restarts. Rejected/pruned cursors fall back
to live events with a logged gap. Hosting and restart policies do not fix that limitation.

The API deduplicates recipe processing in Postgres, but there is no durable outbound delivery queue.
A crash after claiming an API receipt may require the user to resend; a crash after sending a reply
may produce a duplicate reply on replay. Full restart-safe recovery needs a durable inbound queue,
checkpointed provider ingestion, and an outbound delivery ledger before it can be promised.

## Cutover checklist

1. Build the image and configure the three secrets without starting a second consumer.
2. Confirm the host's monthly cost and restart policy before activating the paid service.
3. Stop the local process, start cloud, and confirm Spectrum startup in hosting logs.
4. Test direct saving, group saving, and heart-to-save against linked test accounts.
5. Disconnect the local computer and repeat a phone test to prove independence.
6. Test a cloud network interruption and a full restart separately; record any replay gaps.

Render: the repository-root render.yaml creates one staged worker with automatic deploys disabled. Set MARCO_WORKER_ENABLED=true only during the supervised cutover. The staged process stays alive without opening a Photon connection. Recheck the price shown by Render before creating the service.
