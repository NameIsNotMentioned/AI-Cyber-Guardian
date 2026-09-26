# Training data

`messages.csv` contains the project's small, hand-written demonstration set.
For model training, `backend/fetch_training_data.py` can also download and verify
the `texts.json` subset from [ealvaradob/phishing-dataset](https://huggingface.co/datasets/ealvaradob/phishing-dataset).
The source dataset is published under Apache-2.0, and the download is pinned to
revision `94efbff` and checked against its SHA-256 digest. It contains labeled
message text drawn from email and SMS examples; the trained model combines it
with the local examples after removing exact duplicates.

The external corpus is intentionally not committed to this repository. To
reproduce the training data locally, run:

```sh
python backend/fetch_training_data.py
python backend/model.py
```

The model reports holdout metrics before fitting its final artifact on all
available labeled examples. Metrics on this corpus are not a guarantee of
performance on new phishing campaigns or other languages.
