import os
from io import StringIO
import xml.etree.ElementTree as ET
import shapefile

z_exageration = 100.0

def load_xml(fileName):
    file = open(fileName)
    line = file.read().replace("\n", " ")
    file.close()
    it = ET.iterparse(StringIO(line))
    for _, el in it:
        prefix, has_namespace, postfix = el.tag.partition('}')
        if has_namespace: el.tag = postfix
    return it.root[3][0]

def get(domElement, searchString):
    answer = domElement.findall(searchString)
    if len(answer) == 0:
        return ''
    return answer[0].text

def getList(domElement, searchString):
    return domElement.findall(searchString)

def decideClass(stdSoilNames):
    classes = stdSoilNames.lower().split()
    if (len(classes)) > 1:                      return 'gemengt'
    if classes[0].endswith('zand'):             return 'zand'
    if classes[0].endswith('klei'):             return 'klei'
    if classes[0].endswith('veen'):             return 'veen'
    if classes[0].endswith('leem'):             return 'leem'
    if classes[0].endswith('grind'):            return 'grind'
    if classes[0].endswith('schelpmateriaal'):  return 'schelp'
    if classes[0].endswith('nietbepaald'):      return 'nietbepaald'
    return 'onbekend'

def colorize(soilname):
    if soilname=='zand':                return '1,1,0.55'
    if soilname=='klei':                return '0.67,1,0.43'
    if soilname=='gemengt':             return '0.8,0.8,0.8'
    if soilname=='veen':                return '0.78,0.57,0.96'
    if soilname=='leem':                return '1,0.78,0'
    if soilname=='grind':               return '1,0.27,0.47'
    if soilname=='schelp':              return '0.62,0.84,0.76'
    if soilname=='nietbepaald':         return '0.5,0.5,0.5'
    return '1,1,1'    

class BRO_struct:
    def __init__(self, BRO_tree):
        self.BRO_id                     = get(BRO_tree,'broId')
        self.BRO_date_research          = get(BRO_tree,'researchReportDate/yearMonth')
        self.BRO_coord_wgs              = get(BRO_tree,'standardizedLocation/location/pos')
        self.BRO_coord_rd               = get(BRO_tree,'deliveredLocation/location/pos')
        self.BRO_depth_vsNAP            = get(BRO_tree,'deliveredVerticalPosition/offset')
        self.BRO_depth_start            = get(BRO_tree,'boring/boredTrajectory/beginDepth')
        self.BRO_depth_stop             = get(BRO_tree,'boring/boredTrajectory/endDepth')
        self.BRO_depth_meanWater        = get(BRO_tree,'siteCharacteristic/meanLowestGroundwaterTable')
        self.BRO_drill_diam             = get(BRO_tree,'boring/boringTool/boringToolDiameter')
        self.BRO_landuse                = get(BRO_tree,'siteCharacteristic/landUse')
        self.BRO_drilltype              = get(BRO_tree,'boring/boringTool/boringToolType')
        BRO_ResultList                  = getList(BRO_tree,'boreholeSampleDescription/result/soilLayer')
        self.BRO_NumberOfLayers         = len(BRO_ResultList)
        self.BRO_layer_depth_start      = []
        self.BRO_layer_depth_end        = []
        self.BRO_layer_NumberOfComps    = []
        self.BRO_layer_horizons         = []
        self.BRO_layer_stdSoilNames     = []
        self.BRO_layer_pedSoilNames     = []
        self.BRO_layer_SoilNames        = []
        self.BRO_layer_color            = []
        for soilLayer in BRO_ResultList:
            self.BRO_layer_depth_start.append   (float(get(soilLayer,'upperBoundary')) * z_exageration)
            self.BRO_layer_depth_end.append     (float(get(soilLayer,'lowerBoundary')) * z_exageration)
            self.BRO_layer_NumberOfComps.append (get(soilLayer,'numberOfLayerComponents'))
            BRO_LayerList = getList(soilLayer,'layerComponent')
            BRO_layer_horizon = ''
            BRO_layer_stdSoilName = ''
            BRO_layer_pedSoilName = ''
            for BRO_layer in BRO_LayerList:
                BRO_layer_horizon       += get(BRO_layer,'horizonCode') + ' '
                BRO_layer_stdSoilName   += get(BRO_layer,'soilType/standardSoilName') + ' '
                BRO_layer_pedSoilName   += get(BRO_layer,'soilType/pedologicalSoilName') + ' '
            self.BRO_layer_horizons.append(BRO_layer_horizon.strip())
            self.BRO_layer_stdSoilNames.append(BRO_layer_stdSoilName.strip())
            self.BRO_layer_pedSoilNames.append(BRO_layer_pedSoilName.strip())
            BRO_class = decideClass(BRO_layer_stdSoilName)
            self.BRO_layer_SoilNames.append(BRO_class)
            self.BRO_layer_color.append(colorize(BRO_class))
        print(self.BRO_id)
        #print(".", end='')

def write_BRO_struct(fileName, BRO_records):
    with shapefile.Writer(fileName, shapeType=13) as shapeWriter:    #13
        shapeWriter.field('id', 'C', size=14)
        shapeWriter.field('date', 'C', size=10)
        shapeWriter.field('coord_wgs', 'C', size=20)
        shapeWriter.field('coord_rd', 'C', size=20)
        shapeWriter.field('depthVsNAP', 'C', size=10)
        shapeWriter.field('depthStart', 'C', size=10)
        shapeWriter.field('depthStop', 'C', size=10)
        shapeWriter.field('depthWater', 'C', size=10)
        shapeWriter.field('drill_diam', 'C', size=3)
        shapeWriter.field('landuse', 'C', size=20)
        shapeWriter.field('drilltype', 'C', size=20)
        shapeWriter.field('stdName', 'C', size=50)
        shapeWriter.field('pedName', 'C', size=50)
        shapeWriter.field('Name', 'C', size=9)
        shapeWriter.field('color', 'C', size=15)
        for BRO_record in BRO_records:
            coords = BRO_record.BRO_coord_rd.split()
            x = float(coords[0])
            y = float(coords[1])
            for i in range(BRO_record.BRO_NumberOfLayers):
                coord_start = [x,y,float(BRO_record.BRO_layer_depth_start[i])]
                coord_end   = [x,y,float(BRO_record.BRO_layer_depth_end[i])]
                shapeWriter.linez([[coord_start,coord_end]])
                shapeWriter.record(BRO_record.BRO_id, 
                    BRO_record.BRO_date_research, 
                    BRO_record.BRO_coord_wgs, 
                    BRO_record.BRO_coord_rd, 
                    BRO_record.BRO_depth_vsNAP, 
                    BRO_record.BRO_depth_start, 
                    BRO_record.BRO_depth_stop, 
                    BRO_record.BRO_depth_meanWater, 
                    BRO_record.BRO_drill_diam, 
                    BRO_record.BRO_landuse, 
                    BRO_record.BRO_drilltype,
                    BRO_record.BRO_layer_stdSoilNames[i],
                    BRO_record.BRO_layer_pedSoilNames[i],
                    BRO_record.BRO_layer_SoilNames[i],
                    BRO_record.BRO_layer_color[i])
    shapeWriter.close()


BRO_records = []
directory = './IMBRO XML/'
for filename in os.listdir(directory):
    BRO_tree = load_xml(directory + filename) #BHR000000341853
    BRO_records.append(BRO_struct(BRO_tree))

write_BRO_struct('BRO', BRO_records)
    



