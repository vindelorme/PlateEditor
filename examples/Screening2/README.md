## Screening2 example

- Layout.save: layout file that can be loaded in PlateEditor.
- Definition.txt: text file containing the definition for the range "compounds" defined in the layout. The file can be mapped with a Well ID ("Well") and a Plate ID ("Plate ID"). The definition should be mapped to the "Cpd ID" column.
- Result.txt: text file containing the results for all 10 plates. The file can be mapped with a Well ID ("Well") and a Plate ID ("Plate ID"). The "RFU" column should be imported as a numeric type.

Pairing can be done using the auto-pairing option (pair by name).
Use the "Controls" tool to visualize the controls for each plate.

Note: the data in the result file were randomly generated. Values for the controls are equally distributed around 12,000 ("inhibitor", Positive Control) and 80,000 ("solvent", Negative Control), with a maximum deviation from the mean of ~1,700. The hit-rate is ~5% with hit values being generated identically to the positive control. Other values are centered around the negative control, with variation of +/- 10%
