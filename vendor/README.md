# Third-party components

- `vosk.js`: [vosk-browser](https://github.com/ccoreilly/vosk-browser) 0.0.8 by Ciaran O'Reilly, a WebAssembly build of
  [Vosk](https://github.com/alphacep/vosk-api) / Kaldi. Apache License 2.0.
- `../models/hindi-chant-v1.tgz`: derived from Alpha Cephei's `vosk-model-small-hi-0.22`, Apache License 2.0.
  Trimmed for grammar-only recognition: the general language model (`graph/Gr.fst`) is replaced by a one-state FST
  and `graph/words.txt` keeps only the words the Chalisa grammar uses (original word ids), so it cannot transcribe
  free speech, only the verse words it is given.
