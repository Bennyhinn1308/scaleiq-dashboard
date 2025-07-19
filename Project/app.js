// ScaleIQ Dashboard Application
class ScaleIQDashboard {
    constructor() {
        this.salesData = [];
        this.inventoryData = [];
        this.cashflowData = [];
        this.charts = {};
        this.currentSection = 'overview';
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSampleData();
        this.showSection('overview');
    }

    setupEventListeners() {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', e => {
                e.preventDefault();
                const section = e.target.closest('.nav-link').dataset.section;
                this.showSection(section);
            });
        });

        document.getElementById('fileInput').addEventListener('change', this.handleFileUpload.bind(this));
        document.getElementById('uploadArea').addEventListener('click', () => document.getElementById('fileInput').click());

        document.getElementById('loadSampleData').addEventListener('click', () => this.loadSampleData());
        document.getElementById('exportBtn').addEventListener('click', () => window.print());
        document.getElementById('upgradeBtn').addEventListener('click', () => document.getElementById('upgradeModal').classList.add('active'));
        document.getElementById('closeModal').addEventListener('click', () => document.getElementById('upgradeModal').classList.remove('active'));
    }

    showSection(name){
        document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
        const target=document.getElementById(`${name}-section`);
        if(target){target.classList.add('active');}
        this.currentSection=name;
        if(name==='overview') this.renderOverview();
    }

    // Basic KPI update
    renderOverview(){
        const totalRevenue=this.salesData.reduce((s,v)=>s+v.total_amount,0);
        const totalProfit=this.salesData.reduce((s,v)=>s+v.profit,0);
        const currentCash=this.cashflowData.length?this.cashflowData[this.cashflowData.length-1].cumulative_cash:0;
        const lowStock=this.inventoryData.filter(i=>i.current_stock<=i.reorder_level).length;
        document.getElementById('totalRevenue').textContent=this.formatCurrency(totalRevenue);
        document.getElementById('netProfit').textContent=this.formatCurrency(totalProfit);
        document.getElementById('cashBalance').textContent=this.formatCurrency(currentCash);
        document.getElementById('inventoryAlerts').textContent=lowStock;
        // charts skipped in minimal version
    }

    handleFileUpload(evt){
        const files=Array.from(evt.target.files);
        const statusDiv=document.getElementById('fileStatus');
        const fileList=document.getElementById('fileList');
        statusDiv.style.display='block';
        fileList.innerHTML='';
        files.forEach(file=>{
            const item=document.createElement('div');
            item.textContent=`${file.name} - processing...`;
            fileList.appendChild(item);
            this.processFile(file).then(()=>{
                item.textContent=`${file.name} ✅ processed`;
                this.renderOverview();
            }).catch(err=>{
                item.textContent=`${file.name} ❌ ${err.message}`;
            });
        });
    }

    async processFile(file){
        const ext=file.name.split('.').pop().toLowerCase();
        let data=[];
        if(ext==='csv') data=await this.parseCSV(file);
        else if(['xlsx','xls'].includes(ext)) data=await this.parseExcel(file);
        else throw new Error('Unsupported format');
        // Simple detection: if has invoice_number assume sales
        if(data.length && 'invoice_number' in data[0]) this.salesData=data;
        else if(data.length && 'current_stock' in data[0]) this.inventoryData=data;
    }

    parseCSV(file){
        return new Promise((resolve,reject)=>{
            Papa.parse(file,{header:true,dynamicTyping:true,complete:res=>{
                if(res.errors.length) reject(res.errors[0]); else resolve(res.data);
            }});
        });
    }

    parseExcel(file){
        return new Promise((resolve,reject)=>{
            const reader=new FileReader();
            reader.onload=e=>{
                const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'});
                const ws=wb.Sheets[wb.SheetNames[0]];
                resolve(XLSX.utils.sheet_to_json(ws));
            };
            reader.onerror=()=>reject(new Error('Failed reading file'));
            reader.readAsArrayBuffer(file);
        });
    }

    loadSampleData(){
        this.salesData=[{"date":"2023-07-01","invoice_number":"INV-1000","product_name":"Brake Pad","total_amount":11336,"profit":4136},{"date":"2023-07-02","invoice_number":"INV-1001","product_name":"Spark Plug","total_amount":171038,"profit":61838}];
        this.inventoryData=[{"product_name":"Brake Pad","current_stock":50,"reorder_level":40},{"product_name":"Spark Plug","current_stock":20,"reorder_level":30}];
        this.cashflowData=[{"month":"2023-07","revenue":182374,"cumulative_cash":200000}];
        this.renderOverview();
    }

    formatCurrency(v){return new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(v);}    
}

document.addEventListener('DOMContentLoaded',()=>new ScaleIQDashboard());
