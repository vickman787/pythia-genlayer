# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }

import genlayer as gl

# Intelligent Contract: grounded research synthesis.
#
# The line above is REQUIRED and must be the file's literal first line, before
# any other comment or import — GenVM's schema loader parses it as the
# "runner comment" declaring which GenVM SDK build to run against.

class ResearchContract(gl.contract.Contract):

    def __init__(self):
        pass

    @gl.public.write
    def research(self, query: str, sources: list[dict]) -> dict:
        self._verify_evidence(sources)
        prompt = self._build_prompt(query, sources)

        def call_llm() -> str:
            response = gl.nondet.exec_prompt(prompt)
            return response.strip()

        raw_result = gl.eq_principle.prompt_comparative(
            call_llm,
            (
                "The set of cited source IDs in citationsUsed should be "
                "identical, and the answer text should be semantically "
                "equivalent even if worded differently."
            ),
        )

        return self._parse_result(raw_result, sources)

    def _verify_evidence(self, sources: list[dict]):
        import hashlib
        import json
        import re

        # Mirror of src/lib/registration/canonical.ts (html-text-v1). Both
        # implementations must stay identical, otherwise the independently
        # fetched page can never reproduce the registered content hash.
        def canonicalize(html: str) -> str:
            without_scripts = re.sub(
                r"<script[^>]*>[\s\S]*?</script>", "", html, flags=re.IGNORECASE
            )
            without_styles = re.sub(
                r"<style[^>]*>[\s\S]*?</style>", "", without_scripts, flags=re.IGNORECASE
            )
            without_tags = re.sub(r"</?[^>]+(>|$)", " ", without_styles)
            return re.sub(r"\s+", " ", without_tags).strip()

        for source in sources:
            if not source["sourceUrl"].startswith("https://"):
                raise Exception(f"Unsupported source URL for source {source['id']}")
            if source["canonicalization"] != "html-text-v1":
                raise Exception(f"Unsupported canonicalization for source {source['id']}")

        def read_page(url: str) -> str:
            # The GenVM Response shape is not identical across SDK builds:
            # some expose status_code/body, others status/text. Probe defensively
            # so a runtime attribute difference cannot be mistaken for tampered
            # evidence.
            response = gl.nondet.web.request(url, method="GET")
            status = getattr(response, "status_code", None)
            if status is None:
                status = getattr(response, "status", None)
            if status is not None and int(status) != 200:
                raise Exception(f"Source URL returned {status} for {url}")

            body = getattr(response, "body", None)
            if body is None:
                body = getattr(response, "text", None)
            if body is None:
                raise Exception(f"Source URL returned no readable body for {url}")
            if isinstance(body, (bytes, bytearray)):
                return body.decode("utf-8")
            return str(body)

        def independently_fetch() -> str:
            manifest = []
            for source in sources:
                canonical = canonicalize(read_page(source["sourceUrl"]))
                chunks = [part for part in source["content"].split("\n[...]\n") if part]
                manifest.append({
                    "id": source["id"],
                    "fullHash": hashlib.sha256(canonical.encode()).hexdigest(),
                    "matchedEvidenceHashes": [
                        hashlib.sha256(part.encode()).hexdigest()
                        for part in chunks if part in canonical
                    ],
                })
            # A compact, ordered string keeps strict equality feasible across
            # validators instead of requiring agreement on entire pages.
            return json.dumps(manifest, sort_keys=True)

        verified = json.loads(gl.eq_principle.strict_eq(independently_fetch))
        for source in sources:
            evidence_hashes = [
                hashlib.sha256(part.encode()).hexdigest()
                for part in source["content"].split("\n[...]\n")
                if part
            ]
            if evidence_hashes != source["evidenceHashes"]:
                raise Exception(f"Evidence chunk hash mismatch for source {source['id']}")

            verified_source = next(item for item in verified if item["id"] == source["id"])
            if verified_source["fullHash"] != source["registeredContentHash"]:
                raise Exception(f"Registered source hash mismatch for source {source['id']}")
            if verified_source["matchedEvidenceHashes"] != source["evidenceHashes"]:
                raise Exception(f"Evidence is not present at source URL for source {source['id']}")

    def _build_prompt(self, query: str, sources: list[dict]) -> str:
        source_block = "\n\n".join(
            f"[Source {s['id']}] owner={s['ownerId']} url={s['sourceUrl']} "
            f"registered_hash={s['registeredContentHash']} evidence_hashes={s['evidenceHashes']} "
            f"canonicalization={s['canonicalization']} title={s['title']}:\n{s['content']}" for s in sources
        )
        allowed_ids = ", ".join(f'"{s["id"]}"' for s in sources)
        return f"""Answer the query using ONLY the sources below. Ground every
claim in an explicitly provided source. Treat each source ID, owner ID,
content hash, and evidence hash list as an immutable evidence binding. Do not
invent, alter, or attribute evidence to a different owner.

Query: {query}

Sources:
{source_block}

Allowed source IDs: [{allowed_ids}]

Return strict JSON: {{"answer": "...", "citationsUsed": ["<source id>", ...]}}
Only include a source ID in citationsUsed if its content was actually used.
Copy each ID exactly as written in the allowed source IDs list, with no
"Source" prefix and no surrounding brackets. If any source grounded the
answer, citationsUsed must not be empty.
The source ID must refer to the exact evidence block that supports the answer.
"""

    def _parse_result(self, raw: str, sources: list[dict]) -> dict:
        import json
        # Seen in testing: gl.nondet.exec_prompt() returning "" instead of a
        # response, likely a first-token timeout on a large/noisy prompt —
        # raising here directly instead of letting json.loads blow up gives
        # a message that actually says what happened.
        if not raw:
            raise Exception("LLM returned an empty response (likely a timeout) — no JSON to parse")
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.removeprefix("```json").removeprefix("```").removesuffix("```").strip()
        try:
            parsed = json.loads(cleaned)
        except json.JSONDecodeError:
            # Models sometimes add a short explanation around the JSON. Keep
            # the contract strict while accepting the first complete object.
            start = cleaned.find("{")
            end = cleaned.rfind("}")
            if start < 0 or end <= start:
                raise Exception("LLM returned no JSON object")
            parsed = json.loads(cleaned[start:end + 1])
        # Only IDs supplied in this call are ever accepted. Normalization here
        # tolerates harmless model formatting ("[Source abc]", quoting, case)
        # without widening the set of payable sources.
        valid_by_normalized = {s["id"].strip().lower(): s["id"] for s in sources}

        citations: list[str] = []
        for raw_citation in parsed.get("citationsUsed", []):
            candidate = str(raw_citation).strip().strip("[]").strip().strip("\"'").strip()
            if candidate.lower().startswith("source "):
                candidate = candidate[len("source "):].strip()
            resolved = valid_by_normalized.get(candidate.lower())
            if resolved is not None and resolved not in citations:
                citations.append(resolved)

        return {
            "answer": str(parsed.get("answer", "")).strip(),
            "citationsUsed": citations,
        }
