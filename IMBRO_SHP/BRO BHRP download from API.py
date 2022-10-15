import requests

import csv

with open('./IMBRO XML/brobhrpvolledigesetZE.csv') as csv_file:
    csv_reader = csv.reader(csv_file, delimiter=';')
    line_count = 0
    for row in csv_reader:
        if line_count > 3330:
            #print(row[2])
            url = "https://publiek.broservices.nl/sr/bhrp-v2.0/objects/" + row[2]
            r = requests.get(url, allow_redirects=True)
            open(row[2] + ".xml", 'wb').write(r.content)
        line_count += 1
    print(f'Processed {line_count} lines.')