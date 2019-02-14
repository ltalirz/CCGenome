# -*- coding: utf-8 -*-
# pylint: disable=unsubscriptable-object, too-many-locals
from __future__ import print_function
from os.path import dirname, join

from bokeh.layouts import layout
import bokeh.models as bmd
from bokeh.io import curdoc

#html = bmd.Div(
#    text=open(join(dirname(__file__), "static", "table.html")).read(),
#    width=960)
#curdoc().add_root(layout([html]))

# Put the tabs in the current document for display
curdoc().title = "C-C Cross-Coupling Genome"
curdoc().template_variables["figures"] = [
    {
        "link": "figure",
        "label": "Pd complexes",
        "image": "Pd.png",
    },
    {
        "link": "figure?preset=1b",
        "label": "Pt complexes",
        "image": "Pt.png",
    },
    {
        "link": "figure?preset=1c",
        "label": "Cu complexes",
        "image": "Cu.png",
    },
    {
        "link": "figure?preset=1d",
        "label": "Ni complexes",
        "image": "Ni.png",
    },
    {
        "link": "figure?preset=1e",
        "label": "Au complexes",
        "image": "Au.png",
    },
    {
        "link": "figure?preset=1f",
        "label": "Ag complexes",
        "image": "Ag.png",
    },
]
