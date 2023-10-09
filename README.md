# A Parametric Complete-Garment Sweater Pattern with knitout

## Project Description

The Parametric Complete-Garment Sweater Pattern was developed in 2023 by Pratyay Didwania and Teadora Gildengers, and was advised by James McCann. This pattern takes in a wide range of body measurements and design eases and generates machine knitting instructions for a sweater that requires minimal post-processing.  It is the first open-source parametric sweater pattern.

This project outputs [knitout](https://textiles-lab.github.io/knitout/knitout.html), a file format that can represent low-level knitting machine instructions in a machine-independent way, which was developed by researchers at the Carnegie Mellon University Textiles Lab in 2017. 

## How to use

The [sweater-website.html](https://github.com/textiles-lab/parametric-sweater/blob/main/frontend/sweater-website.html) file can be used to generate a json file that can be passed into [sweater_pattern.mjs](https://github.com/textiles-lab/parametric-sweater/blob/main/backend/sweater_pattern.mjs). This can then be run to generate a knitout file. 

If you have wish to run the file on a Shima Seiki knitting machine, please contact jmccann@cs.cmu.edu for a knitout-to-dat converter. If you have a Kniterate, please use the public [knitout to k-code converter](https://github.com/textiles-lab/knitout-backend-kniterate). If you have a STOLL knitting machine, some backends are currently in development. Please note that this pattern was developed for and tested on a Shima Seiki machine.

## Contributing to the Project

There is a lot that can be done to extend the pattern, and we are happy to review pull requests. 
If you have feature requests, suggestions, comments, or revisions please don't hesitate to add them to the [Issues](https://github.com/textiles-lab/parametric-sweater/issues) page.

To contact the authors directly, please send an email to pratyay@cmu.edu and jmccann@cs.cmu.edu .

## Acknowledgements

We thank Jenny Lin, Gabrielle Ohlson, Lea Albaugh and the rest of the Carnegie Mellon University Textiles Lab for their advice, guidance, and willingness to test and model our work.

This material is based upon work partially supported by the National Science Foundation under an REU supplement to Grant No. 1955444. Any opinions, findings, and conclusions or recommendations expressed in this material are those of the author(s) and do not necessarily reflect the views of the National Science Foundation.
