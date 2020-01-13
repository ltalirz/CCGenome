# -*- coding: utf-8 -*-
# pylint: disable=unsubscriptable-object, too-many-locals
from __future__ import print_function
from bokeh.io import curdoc

#from os.path import dirname, join
#from bokeh.layouts import layout
#import bokeh.models as bmd
#html = bmd.Div(
#    text=open(join(dirname(__file__), "static", "table.html")).read(),
#    width=960)
#curdoc().add_root(layout([html]))

# Put the tabs in the current document for display
curdoc().title = "C-C Cross-Coupling Genome"
curdoc().template_variables["figures"] = [
    {
        "link": "figure?preset=Ni",
        "label": "Ni complexes",
        "image": "Ni.png",
    },
    {
        "link": "figure?preset=Pd",
        "label": "Pd complexes",
        "image": "Pd.png",
    },
    {
        "link": "figure?preset=Pt",
        "label": "Pt complexes",
        "image": "Pt.png",
    },
    {
        "link": "figure?preset=Cu",
        "label": "Cu complexes",
        "image": "Cu.png",
    },
    {
        "link": "figure?preset=Ag",
        "label": "Ag complexes",
        "image": "Ag.png",
    },
    {
        "link": "figure?preset=Au",
        "label": "Au complexes",
        "image": "Au.png",
    },
]
