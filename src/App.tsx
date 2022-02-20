import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import moment from 'moment';
import Chart from 'react-apexcharts';
import { CSVLink } from "react-csv";
import './App.css';

import { shops } from './constants/shops';
import { SeriesFormat, ExportFormat1, ExportFormat2 } from './constants/types';

const getProducts = async (shopUrl: string, page: number) => {
  const res = await axios.get(shopUrl + `/products.json?page=${page}&limit=250`);
  console.log(res);
  return res.data.products;
}


const headers1 = [
  { label: "Date", key: "date" },
  { label: "Products", key: "products" }
];

const headers2 = [
  { label: "Product Type", key: "product_type" },
  { label: "Products", key: "products" }
];

function App() {
  
  const [fetching, setFetching] = useState<boolean>(false);
  const [exporting, setExporting] = useState<boolean>(false);
  const [series, setSeries] = useState<SeriesFormat>({count1: 0, count2: 0, count3: 0});
  const [categories, setCategories] = useState<Array<string>>([]);
  const [categoryCount, setCategoryCount] = useState<Array<number>>([]);
  const [search, setSearch] = useState<string>('gymshark.com');
  const [exportData1, setExportData1] = useState<Array<ExportFormat1>>([]);
  const [exportData2, setExportData2] = useState<Array<ExportFormat2>>([]);

  const csvLinkEl1 = useRef(null);
  const csvLinkEl2 = useRef(null);
    
  const options1 = {
    chart: {
      id: 'month-count-graph'
    },
    xaxis: {
      categories: ['Dec', 'Jan', 'Feb']
    }
  };

  const options2 = {
    chart: {
      id: 'category-count-graph'
    },
    plotOptions: {
      bar: {
        horizontal: true,
      }
    },
    dataLabels: {
      enabled: false
    },
    xaxis: {
      categories: [],
    }
  };

  
  async function getData() {
    setFetching(true);
    let cats: string[] = [];
    let catsCounts: number[] = [];
    let lastID = 1;
    let page = 1;

    while(lastID > 0) {
      const productsData = await getProducts('https://' + search, page);
      lastID = productsData.length;
      
      let count1 = 0;
      let count2 = 0;
      let count3 = 0;

      productsData.map((p: any) => {
        if(moment(p.published_at).format("YYYY/MM") === '2022/02') {
          count3++;
        }
        if(moment(p.published_at).format("YYYY/MM") === '2022/01') {
          count2++;
        }
        if(moment(p.published_at).format("YYYY/MM") === '2021/12') {
          count1++;
        }
        if(cats.includes(p.product_type)) {
          catsCounts[p.product_type] ++;
        } else {
          catsCounts[p.product_type] = 1;
          cats.push(p.product_type);
        }

      })
      
      setSeries((oldSeries: any) => ({ count1: oldSeries.count1 + count1, count2: oldSeries.count2 + count2, count3: oldSeries.count3 + count3 }));
      page++;
    }
    setCategories(cats);
    setCategoryCount(cats.map((cat: any) => catsCounts[cat]));
    setFetching(false);
  }

  useEffect(() => {
    getData();
  }, []);


  const handleChange = ( e: React.ChangeEvent<HTMLSelectElement> ): void => {
    setSearch(e.target.value);
  }

  const handleSearch = (): void => {
    setCategories([]);
    setCategoryCount([]);
    setSeries({count1: 0, count2: 0, count3: 0});
    getData();
  }



  const handleExportAll = async (): Promise<void> => {
    setExporting(true);
    for(let  i = 0; i < shops.length; i ++) {
      let cats: string[] = [];
      let catsCounts: number[] = [];

      let epage = 1;
      let elastID = 1;

      let dates: string[] = [];
      let datesCounts: number[] = [];

      while(elastID > 0) {
        const productsData = await getProducts(`https://${shops[i]}`, epage);
        elastID = productsData.length;
        
        productsData.map((p: any) => {
          const d = moment(p.published_at).format("YYYY-MM-DD");
          if(dates.includes(d)) {
            datesCounts[d as any] ++;
          } else {
            datesCounts[d as any] = 1;
            dates.push(d);
          }

          if(cats.includes(p.product_type)) {
            catsCounts[p.product_type] ++;
          } else {
            catsCounts[p.product_type] = 1;
            cats.push(p.product_type);
          }

        })
        epage++;
      }
      let exportTemp1: Array<ExportFormat1> = [];
      let exportTemp2: Array<ExportFormat2> = [];

      // Export to Products_by_date.csv
      dates.map((d: string) => {
        exportTemp1.push({
          'date': d,
          'products': datesCounts[d as any]
        })
      });
      
      setExportData1(exportTemp1);


      if(csvLinkEl1 && csvLinkEl1.current) {
        let link: any = (csvLinkEl1.current as any)?.link;
        link.download = 'product_by_date_' + shops[i] + '.csv';
        link.click();
      }
      
      // Export to Products_by_type.csv
      cats.map((cat: string) => {
        exportTemp2.push({
          'product_type': cat,
          'products': catsCounts[cat as any]
        })
      });
      
      setExportData2(exportTemp2);
      
      if(csvLinkEl2 && csvLinkEl2.current) {
        let link: any = (csvLinkEl2.current as any)?.link;
        link.download = 'product_by_type_' + shops[i] + '.csv';
        link.click();
      }
    }

    setExporting(false);
  }

  return (
    <div className="App">
      <div className='left-panel'>
        <div>
          <select value={search} onChange={handleChange}>
              {shops.map((shop: string) => <option key={shop} value={shop}>{shop}</option>)}
            </select>
          <button onClick={handleSearch} disabled={fetching}>Fetch Data</button>
        </div>
        { fetching ? 'fetching...' : <>
          
          <p>Launched products in last 3 months</p>

          <Chart 
            options={options1} 
            series={[{
              name: 'Launched',
              data: [series.count1, series.count2, series.count3]
            }]} 
            type="bar" 
            width={500} 
            height={320} />

          <p>Launched products grouped by PRODUCT TYPE</p>

          <Chart 
              options={
                {
                  ...options2, 
                  xaxis: {categories: categories}
                }
              } 
              series={[{
                data: categoryCount
              }]}
              type="bar" 
              width={500} 
              height={1020} />
        </> }
      </div>
      <div className='right-panel'>
        <button onClick={handleExportAll} disabled={exporting}>Export All Sites Data</button>
        { exporting ? 'Exporting...' : <>

        </>}
        <CSVLink
          headers={headers1}
          filename="product_by_date.csv"
          data={exportData1}
          ref={csvLinkEl1}
        />
        <CSVLink
          headers={headers2}
          filename="product_by_type.csv"
          data={exportData2}
          ref={csvLinkEl2}
        />
      </div>
    </div>
  );
}

export default App;
