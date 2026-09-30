
  const API_URL = 'https://script.google.com/macros/s/AKfycbx7H5i_vq7CwcA-1KjwTTc_xiIwLvBL0h3fc6mVvYZ1cIj116XOvSlNLsy3NhxVwoSL/exec';

  async function apiGet(action, params = {}) {
    const url = new URL(API_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v ?? ''));
    const response = await fetch(url.toString(), { method: 'GET', redirect: 'follow' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (payload && payload.ok === false) throw new Error(payload.error || 'API error');
    return payload && Object.prototype.hasOwnProperty.call(payload, 'data') ? payload.data : payload;
  }

let globalRawList = []; 

  let filteredList = [];  

  let currentTab = 'roster-ori';

  let isSidebarCollapsed = false;



  // Pagination & Search States

  let currentPage = 1;

  let entriesPerPage = 10;

  let searchQuery = '';



// Date Picker States (Realtime)

  const now = new Date();

  const monthList = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];



  let selectedMonthStr = monthList[now.getMonth()]; // Mengambil bulan saat ini (misal: 'Sep')

  let selectedYearNum = now.getFullYear();          // Mengambil tahun saat ini (misal: 2026)

  let pickerYearNum = now.getFullYear();          // Mengambil tahun saat ini untuk tampilan picker



  window.onload = function() {

    renderMonthsGrid();

    loadEmployeeDropdown();



    document.addEventListener('click', function(e) {

      const popup = document.getElementById('date-picker-popup');

      const trigger = e.target.closest('.relative');

      if (!trigger && popup && !popup.classList.contains('hidden')) {

        popup.classList.add('hidden');

      }

    });

  };



  function toggleSidebar() {

    const sidebar = document.getElementById('sidebar-container');

    const backdrop = document.getElementById('sidebar-backdrop');

    const texts = document.querySelectorAll('.sidebar-text');



    if (!sidebar) return;



    if (window.innerWidth < 768) {

      if (sidebar.classList.contains('-translate-x-full')) {

        sidebar.classList.remove('-translate-x-full');

        if (backdrop) backdrop.classList.remove('hidden');

      } else {

        sidebar.classList.add('-translate-x-full');

        if (backdrop) backdrop.classList.add('hidden');

      }

    } else {

      isSidebarCollapsed = !isSidebarCollapsed;

      if (isSidebarCollapsed) {

        sidebar.classList.remove('w-64');

        sidebar.classList.add('w-20');

        texts.forEach(el => el.classList.add('hidden'));

      } else {

        sidebar.classList.remove('w-20');

        sidebar.classList.add('w-64');

        texts.forEach(el => el.classList.remove('hidden'));

      }

    }

  }



  function toggleDatePicker(event) {

    if (event) event.stopPropagation();

    const popup = document.getElementById('date-picker-popup');

    if (popup) {

      popup.classList.toggle('hidden');

      if (!popup.classList.contains('hidden')) {

        renderMonthsGrid();

      }

    }

  }



  function changePickerYear(delta) {

    pickerYearNum += delta;

    const yearDisplay = document.getElementById('picker-year-display');

    if (yearDisplay) yearDisplay.innerText = pickerYearNum;

    renderMonthsGrid();

  }



  function renderMonthsGrid() {

    const grid = document.getElementById('months-grid');

    if (!grid) return;

    grid.innerHTML = '';



    monthList.forEach(m => {

      const btn = document.createElement('button');

      btn.type = 'button';

      btn.className = \`py-2 text-sm rounded-xl border transition font-medium text-center ${

        (m === selectedMonthStr && pickerYearNum === selectedYearNum) 

          ? 'border-blue-400 font-bold bg-blue-600/70 text-white shadow-md' 

          : 'border-transparent text-slate-300 hover:bg-white/10'

      }\`;

      btn.textContent = m;

      btn.onclick = function() {

        selectedMonthStr = m;

        selectedYearNum = pickerYearNum;

        const label = document.getElementById('selected-date-label');

        if (label) label.innerText = \`${selectedMonthStr}-${selectedYearNum}\`;

        toggleDatePicker();

        fetchData();

      };

      grid.appendChild(btn);

    });

  }



  function loadEmployeeDropdown() {

    if (typeof google !== 'undefined' && google.script && google.script.run) {

      google.script.run

        .withSuccessHandler(function(employees) {

          populateEmployeeSelect(employees);

        })

        .withFailureHandler(function(err) {

          showError("Gagal memuat daftar karyawan: " + err.message);

        })

        .getEmployeeList();

    } else {

      setTimeout(() => {

        populateEmployeeSelect([

          { nama: 'M. SETYO DWI PUTRA', perner: '1001', fullSheetName: '1001' },

          { nama: 'DINA FITRIA', perner: '1002', fullSheetName: '1002' }

        ]);

      }, 500);

    }

  }



  function populateEmployeeSelect(employees) {

    const select = document.getElementById('select-employee');

    if (!select) return;

    select.innerHTML = '';



    if (!employees || employees.length === 0) {

      select.innerHTML = '<option value="" class="bg-slate-900">Data Karyawan Kosong</option>';

      showLoading(false);

      return;

    }



    employees.forEach(emp => {

      let opt = document.createElement('option');

      opt.className = 'bg-slate-900 text-slate-200';

      opt.value = emp.fullSheetName || emp.perner;

      opt.textContent = \`${emp.nama} [${emp.perner}]\`;

      select.appendChild(opt);

    });



    fetchData();

  }



  function showLoading(isLoading) {

    const el = document.getElementById('loading');

    const content = document.getElementById('content-area');

    if (isLoading) {

      if (el) el.classList.remove('hidden');

      if (content) content.classList.add('hidden');

    } else {

      if (el) el.classList.add('hidden');

      if (content) content.classList.remove('hidden');

    }

  }



  function showError(msg) {

    const container = document.getElementById('content-area');

    showLoading(false);

    if (container) {

      container.innerHTML = \`

        <div class="bg-rose-950/40 border-l-4 border-rose-500 p-4 rounded-r-2xl border border-rose-900/50 backdrop-blur">

          <p class="text-sm text-rose-300 font-medium">${msg}</p>

        </div>

      \`;

    }

  }



  function fetchData() {

    showLoading(true);

    const empSelect = document.getElementById('select-employee');

    const emp = empSelect ? empSelect.value : '';

    const monthYear = \`${selectedMonthStr}-${selectedYearNum}\`;



    if (currentTab === 'tabel-roster') {

      loadTabelRekapAll(monthYear);

      return;

    }



    if (typeof google !== 'undefined' && google.script && google.script.run) {

      google.script.run

        .withSuccessHandler(function(data) {

          showLoading(false);

          if (data && data.employeeName) {

            const userDisp = document.getElementById('user-display-name');

            if (userDisp) userDisp.innerText = data.employeeName;

          }

          window.lastServerData = data;

          applyTabSelection();

        })

        .withFailureHandler(function(err) {

          showLoading(false);

          showError("Gagal mengambil data roster: " + err.message);

        })

        .getRosterData(emp, monthYear);

    } else {

      setTimeout(() => {

        showLoading(false);

        window.lastServerData = {

          employeeName: 'M. SETYO DWI PUTRA',

          summary: { totalKerja: 22, totalOff: 8, totalTakeOff: 0, totalCuti: 0, totalAllowance: 15 },

          original: [],

          sc: []

        };

        applyTabSelection();

      }, 600);

    }

  }



  // =========================================================

  // MEMUAT DATA TABEL REKAP KESELURUHAN (SEMUA KARYAWAN)

  // =========================================================

  function loadTabelRekapAll(monthYear) {

    showLoading(true);

    if (!monthYear) monthYear = \`${selectedMonthStr}-${selectedYearNum}\`;



    if (typeof google !== 'undefined' && google.script && google.script.run) {

      google.script.run

        .withSuccessHandler(function(response) {

          if (response && (response.original || response.sc || Array.isArray(response))) {

            const transformedMatrix = transformAllEmployeesToHorizontalMatrix(response);

            renderTabelRekapHTML(transformedMatrix);

          } else {

            renderTabelRekapHTML(response);

          }

        })

        .withFailureHandler(function(err) {

          showLoading(false);

          showError("Gagal memuat rekap roster: " + err.message);

        })

        .getAllEmployeesRosterData(monthYear);

    } else {

      // Dummy data simulasi rekap seluruh karyawan saat di lingkungan lokal

      setTimeout(() => {

        const dummyAllData = {

          original: [

            {

              employeeName: 'M. SETYO DWI PUTRA',

              dates: [

                { tglMasuk: '01', hari: 'Selasa', jamKerja: '07:00 - 16:00', keterangan: '' },

                { tglMasuk: '02', hari: 'Rabu', jamKerja: '', keterangan: 'OFF' },

                { tglMasuk: '03', hari: 'Kamis', jamKerja: '08:00 - 17:00', keterangan: '' }

              ]

            },

            {

              employeeName: 'DINA FITRIA',

              dates: [

                { tglMasuk: '01', hari: 'Selasa', jamKerja: '08:00 - 17:00', keterangan: '' },

                { tglMasuk: '02', hari: 'Rabu', jamKerja: '08:00 - 17:00', keterangan: '' },

                { tglMasuk: '03', hari: 'Kamis', jamKerja: '', keterangan: 'CUTI' }

              ]

            }

          ],

          sc: [

            {

              employeeName: 'M. SETYO DWI PUTRA',

              dates: [

                { tglMasuk: '01', hari: 'Selasa', jamKerja: '07:00 - 16:00', keterangan: '' },

                { tglMasuk: '02', hari: 'Rabu', jamKerja: '', keterangan: 'OFF' },

                { tglMasuk: '03', hari: 'Kamis', jamKerja: '07:00 - 16:00', keterangan: '' }

              ]

            },

            {

              employeeName: 'DINA FITRIA',

              dates: [

                { tglMasuk: '01', hari: 'Selasa', jamKerja: '08:00 - 17:00', keterangan: '' },

                { tglMasuk: '02', hari: 'Rabu', jamKerja: '', keterangan: 'ROC' },

                { tglMasuk: '03', hari: 'Kamis', jamKerja: '', keterangan: 'CUTI' }

              ]

            }

          ]

        };

        const transformedMatrix = transformAllEmployeesToHorizontalMatrix(dummyAllData);

        renderTabelRekapHTML(transformedMatrix);

      }, 500);

    }

  }



  // =========================================================

  // LOGIKA TRANSFORMASI DATA REKAP KE BENTUK MATRIKS

  // =========================================================

  function transformAllEmployeesToHorizontalMatrix(serverData) {

    if (!serverData) return [];



    if (Array.isArray(serverData) && Array.isArray(serverData[0])) {

      return serverData;

    }



    const matrix = [];



    function getCellValue(item) {

      if (!item) return '-';

      const jam = item.jamKerja ? String(item.jamKerja).trim() : '';

      const ket = item.keterangan ? String(item.keterangan).trim() : '';

      return (!jam || jam === '-' || jam === '') ? (ket !== '' ? ket : '-') : jam;

    }



    // Process JADWAL ORIGINAL

    if (serverData.original && serverData.original.length > 0) {

      const dates = serverData.original[0].dates || [];

      const totalCols = dates.length + 1;



      matrix.push([\`SECTION_HEADER:JADWAL ORI:${totalCols}\`]);



      const tglRow = ['NAMA TA'];

      const hariRow = [''];

      dates.forEach(d => {

        tglRow.push(d.tglMasuk || '-');

        hariRow.push(d.hari || '-');

      });

      matrix.push(tglRow, hariRow);



      serverData.original.forEach(emp => {

        const row = [emp.employeeName || 'TANPA NAMA'];

        (emp.dates || []).forEach(d => row.push(getCellValue(d)));

        matrix.push(row);

      });

    }



    // Process JADWAL SCHEDULE CHANGE (SC)

    if (serverData.sc && serverData.sc.length > 0) {

      const dates = serverData.sc[0].dates || [];

      const totalCols = dates.length + 1;



      matrix.push([\`SECTION_HEADER:JADWAL SC:${totalCols}\`]);



      const tglRow = ['NAMA TA'];

      const hariRow = [''];

      dates.forEach(d => {

        tglRow.push(d.tglMasuk || '-');

        hariRow.push(d.hari || '-');

      });

      matrix.push(tglRow, hariRow);



      serverData.sc.forEach(emp => {

        const row = [emp.employeeName || 'TANPA NAMA'];

        (emp.dates || []).forEach(d => row.push(getCellValue(d)));

        matrix.push(row);

      });

    }



    return matrix;

  }



  // =========================================================

  // RENDERING TABEL REKAP HORIZONTAL DI HTML (DENGAN HIGHLIGHT HARI INI)

  // =========================================================

  function renderTabelRekapHTML(matrix) {

    showLoading(false);

    const container = document.getElementById('content-area');

    if (!container) return;



    if (!matrix || matrix.length === 0) {

      container.innerHTML = \`

        <div class="glass-panel p-8 rounded-2xl text-center">

          <i class="fas fa-folder-open text-4xl text-slate-500 mb-3 block"></i>

          <p class="text-slate-300 font-medium">Data rekap roster tidak ditemukan atau sheet kosong.</p>

        </div>\`;

      return;

    }



    const cleanMatrix = matrix.filter(row => row && row.some(cell => cell !== "" && cell !== null));



    // Menentukan Format Tanggal Hari Ini

    const today = new Date();

    const dd = String(today.getDate()).padStart(2, '0');

    const mm = String(today.getMonth() + 1).padStart(2, '0');

    const yyyy = today.getFullYear();



    const todayFormatted1 = \`${yyyy}-${mm}-${dd}\`; // 2026-09-19

    const todayFormatted2 = \`${dd}/${mm}/${yyyy}\`; // 19/09/2026

    const todayDayNum = today.getDate();            // 19



    let todayColIndexes = new Set(); // Menyimpan indeks kolom yang merupakan 'Hari Ini'



    let html = \`

      <div class="glass-panel rounded-2xl p-4 sm:p-5 shadow-2xl">

        <div class="flex justify-between items-center mb-4 px-2">

          <h3 class="text-sm sm:text-base font-bold text-white flex items-center gap-2">

            <i class="fas fa-table text-blue-400"></i> All Roster TA GarudaMiles

          </h3>

          <button onclick="toggleFullscreen()" class="border border-white/10 px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-white/10 transition">

            <i class="fas fa-expand mr-1"></i> Fullscreen

          </button>

        </div>



        <div class="overflow-x-auto max-h-[80vh] border border-slate-700/60 rounded-xl shadow-inner">

          <table class="w-full text-xs border-collapse font-sans min-w-[1000px]">\`;



    cleanMatrix.forEach((row, rowIndex) => {

      const firstCell = String(row[0] || '');



      // 1. BANNER HEADER SEKSI (JADWAL ORI / JADWAL SC)

      if (firstCell.startsWith('SECTION_HEADER:')) {

        const parts = firstCell.split(':');

        const title = parts[1] || '';

        const colspanVal = parts[2] || '1';

        todayColIndexes.clear(); // Reset penanda kolom hari ini per seksi



        html += \`

          <tr class="bg-blue-900/90 text-white font-bold text-xs uppercase tracking-wider">

            <th colspan="${colspanVal}" class="p-2 border border-blue-800 text-left px-4 sticky left-0 z-30 bg-blue-900 shadow-md">

              <i class="fas fa-calendar-alt mr-2 text-blue-300"></i>${title}

            </th>

          </tr>\`;

      } 

      // 2. HEADER TANGGAL & HARI

      else if (firstCell.includes('NAMA TA') || row.some(c => typeof c === 'string' && ['SENIN','SELASA','RABU','KAMIS','JUMAT','SABTU','MINGGU'].includes(c.trim().toUpperCase()))) {



        // Deteksi kolom mana saja yang merupakan tanggal hari ini

        if (firstCell.includes('NAMA TA')) {

          row.forEach((cell, colIdx) => {

            if (colIdx > 0 && cell) {

              const strCell = String(cell).trim();

              if (

                strCell === todayFormatted1 || 

                strCell === todayFormatted2 || 

                parseInt(strCell, 10) === todayDayNum

              ) {

                todayColIndexes.add(colIdx);

              }

            }

          });

        }



        html += \`<tr class="bg-slate-800 text-slate-200 font-bold text-xs">\`;

        row.forEach((cell, colIdx) => {

          const val = (cell !== null && cell !== undefined) ? String(cell).toUpperCase() : '';

          const isTodayCol = todayColIndexes.has(colIdx);



          let stickyClass = colIdx === 0 ? 'sticky left-0 z-20 bg-slate-800 border-r border-slate-600 shadow-md' : '';

          let bgHeader = isTodayCol ? 'bg-amber-500/30 text-amber-300 border-amber-500/50' : '';



          html += \`

            <th class="p-2 border border-slate-700 text-center whitespace-nowrap ${stickyClass} ${bgHeader}">

              <div class="flex flex-col items-center justify-center gap-0.5">

                <span>${val}</span>

                ${isTodayCol && firstCell.includes('NAMA TA') ? '<span class="bg-amber-400 text-slate-950 text-[9px] font-extrabold px-1 rounded shadow">HARI INI</span>' : ''}

              </div>

            </th>\`;

        });

        html += \`</tr>\`;

      } 

      // 3. BARIS DATA KARYAWAN & SHIFT

      else {

        const rowBgClass = (rowIndex % 2 === 0) ? 'bg-slate-900/90' : 'bg-slate-800/80';

        html += \`<tr class="${rowBgClass} text-slate-200 hover:bg-slate-700/50 transition">\`;



        row.forEach((cell, colIdx) => {

          let cellVal = (cell !== null && cell !== undefined) ? String(cell).trim() : '';

          let cellStyle = 'bg-slate-900/90 text-slate-200 border-slate-700/80';

          let stickyClass = '';

          const isTodayCol = todayColIndexes.has(colIdx);



          // Kolom Nama Karyawan Sticky di Kiri

          if (colIdx === 0) {

            stickyClass = 'sticky left-0 z-10 bg-slate-900 font-semibold text-slate-100 text-left px-3 border-r-2 border-slate-600';

          } else {

            const upperVal = cellVal.toUpperCase();



            // Status Libur/Cuti/ROC -> Fill HITAM & Uppercase

            if (

              upperVal === 'OFF' || 

              upperVal === 'LIBUR' || 

              upperVal.includes('TAKE OFF') || 

              upperVal.includes('CUTI') || 

              upperVal === 'CT' || 

              upperVal.includes('READY ON CALL') || 

              upperVal.includes('ROC')

            ) {

              cellVal = upperVal;

              // Jika hari ini, berikan garis tepi/aksen kuning

              cellStyle = isTodayCol 

                ? 'bg-black text-amber-300 font-bold text-center border-2 border-amber-400/80' 

                : 'bg-black text-white font-bold text-center';

            } else if (upperVal.includes(':') || upperVal.includes('-')) {

              cellStyle = isTodayCol 

                ? 'bg-amber-500/25 text-amber-200 font-mono text-center font-bold border-amber-500/40' 

                : 'text-amber-200 font-mono text-center font-medium';

            } else {

              cellVal = upperVal;

              cellStyle = isTodayCol 

                ? 'bg-amber-500/20 text-amber-200 text-center font-bold' 

                : 'text-center text-slate-300';

            }

          }



          html += \`<td class="p-1.5 border border-slate-700 whitespace-nowrap text-[11px] ${cellStyle} ${stickyClass}">${cellVal}</td>\`;

        });



        html += \`</tr>\`;

      }

    });



    html += \`

          </table>

        </div>

      </div>\`;



    container.innerHTML = html;

  }



  // =========================================================

  // NAVIGASI SWITCH TAB MENU

  // =========================================================

  function switchTab(tabName) {

    currentTab = tabName;



    // Highlight tombol navigasi sidebar

    document.querySelectorAll('nav a').forEach(el => {

      el.classList.remove('sidebar-active', 'text-white');

      el.classList.add('text-slate-300', 'sidebar-hover');

    });



    const activeNav = document.getElementById(\`nav-${tabName}\`);

    if (activeNav) {

      activeNav.classList.add('sidebar-active', 'text-white');

      activeNav.classList.remove('text-slate-300', 'sidebar-hover');

    }



    // Sembunyikan/Tampilkan Dropdown Filter Karyawan

    const empFilterContainer = document.getElementById('filter-karyawan-container');

    if (empFilterContainer) {

      if (tabName === 'tabel-roster') {

        empFilterContainer.style.display = 'none';

      } else {

        empFilterContainer.style.display = 'block';

      }

    }



    // Auto close sidebar pada tampilan mobile

    if (window.innerWidth < 768) {

      const sidebar = document.getElementById('sidebar-container');

      const backdrop = document.getElementById('sidebar-backdrop');

      if (sidebar) sidebar.classList.add('-translate-x-full');

      if (backdrop) backdrop.classList.add('hidden');

    }



    const container = document.getElementById('content-area');

    if (container) container.innerHTML = '';



    if (tabName === 'tabel-roster') {

      const monthYear = \`${selectedMonthStr}-${selectedYearNum}\`;

      loadTabelRekapAll(monthYear);

    } else {

      applyTabSelection();

    }

  }



  function applyTabSelection() {

    if (!window.lastServerData && currentTab !== 'tabel-roster') {

      fetchData();

      return;

    }



    const container = document.getElementById('content-area');

    if (container) container.innerHTML = '';



    if (currentTab === 'dashboard') {

      renderDashboard(window.lastServerData ? window.lastServerData.summary : null);

    } else if (currentTab === 'roster-ori') {

      globalRawList = window.lastServerData ? window.lastServerData.original : [];

      resetFilterAndRender();

    } else if (currentTab === 'roster-sc') {

      globalRawList = window.lastServerData ? window.lastServerData.sc : [];

      resetFilterAndRender();

    }

  }



  function resetFilterAndRender() {

    searchQuery = '';

    currentPage = 1;



    const inputEl = document.getElementById('search-input-field');

    if (inputEl) inputEl.value = '';



    filterDataAndRender();

  }



  function handleSearchInput(val) {

    searchQuery = val.toLowerCase();

    currentPage = 1;

    filterDataAndRender();

  }



  function handleEntriesChange(val) {

    entriesPerPage = parseInt(val, 10);

    currentPage = 1;

    renderRowsAndPaginationOnly();

  }



  function filterDataAndRender() {

    if (!searchQuery) {

      filteredList = [...globalRawList];

    } else {

      filteredList = globalRawList.filter(item => {

        return (

          (item.tglMasuk || '').toString().toLowerCase().includes(searchQuery) ||

          (item.hari || '').toLowerCase().includes(searchQuery) ||

          (item.pernerId || '').toString().toLowerCase().includes(searchQuery) ||

          (item.shift || '').toLowerCase().includes(searchQuery) ||

          (item.jamKerja || '').toLowerCase().includes(searchQuery) ||

          (item.ws || '').toLowerCase().includes(searchQuery) ||

          (item.keterangan || '').toLowerCase().includes(searchQuery) ||

          (item.shiftAllowance || '').toLowerCase().includes(searchQuery)

        );

      });

    }



    const rowsContainer = document.getElementById('table-rows-container');

    if (!rowsContainer) {

      renderTableUI();

    } else {

      renderRowsAndPaginationOnly();

    }

  }



  function renderTableUI() {

    const container = document.getElementById('content-area');

    if (!container) return;



    const tableTitle = currentTab === 'roster-sc' 

      ? 'Roster Schedule Change' 

      : 'Roster Original';



    container.innerHTML = \`

      <div class="glass-panel rounded-2xl p-4 sm:p-6 shadow-2xl">

        <div class="flex justify-between items-center mb-6">

          <h3 class="text-base sm:text-lg font-bold text-white tracking-wide">${tableTitle}</h3>

          <button onclick="toggleFullscreen()" class="border border-white/10 px-3 py-1.5 rounded-xl text-xs text-slate-300 hover:bg-white/10 transition">

            <i class="fas fa-expand mr-1"></i> Fullscreen

          </button>

        </div>



        <div class="flex flex-col sm:flex-row justify-between items-stretch sm:items-center mb-4 gap-3 sm:gap-4">

          <div class="flex items-center text-xs sm:text-sm text-slate-300">

            <select onchange="handleEntriesChange(this.value)" class="glass-input rounded-xl px-2 py-1 mr-2 focus:outline-none">

              <option value="10" ${entriesPerPage === 10 ? 'selected' : ''} class="bg-slate-900">10</option>

              <option value="25" ${entriesPerPage === 25 ? 'selected' : ''} class="bg-slate-900">25</option>

              <option value="50" ${entriesPerPage === 50 ? 'selected' : ''} class="bg-slate-900">50</option>

              <option value="100" ${entriesPerPage === 100 ? 'selected' : ''} class="bg-slate-900">100</option>

            </select>

            <span>entries per page</span>

          </div>



          <div class="flex items-center text-xs sm:text-sm w-full sm:w-auto">

            <span class="mr-2 text-slate-300">Search:</span>

            <input type="text" id="search-input-field" value="${searchQuery}" oninput="handleSearchInput(this.value)" placeholder="Cari data..." class="glass-input px-3 py-1.5 rounded-xl focus:outline-none w-full sm:w-56">

          </div>

        </div>



        <div id="table-rows-container"></div>

      </div>

    \`;



    renderRowsAndPaginationOnly();

  }



  function renderRowsAndPaginationOnly() {

    const container = document.getElementById('table-rows-container');

    if (!container) return;



    const totalEntries = filteredList.length;

    const totalPages = Math.ceil(totalEntries / entriesPerPage) || 1;

    if (currentPage > totalPages) currentPage = totalPages;



    const startIndex = (currentPage - 1) * entriesPerPage;

    const endIndex = Math.min(startIndex + entriesPerPage, totalEntries);

    const pageData = filteredList.slice(startIndex, endIndex);



    const showAllowance = currentTab !== 'roster-ori';

    const colSpanCount = showAllowance ? 11 : 10;



    let rowsHtml = '';

    if (pageData.length === 0) {

      rowsHtml = \`<tr><td colspan="${colSpanCount}" class="text-center p-8 text-slate-400">Tidak ada data yang sesuai dengan pencarian.</td></tr>\`;

    } else {

      rowsHtml = pageData.map(item => {

        const isAllowance = (item.shiftAllowance || '').toString().trim().toLowerCase() === 'ya';



        // Deteksi Tanggal Hari Ini

        const tglStr = String(item.tglMasuk || '').trim();

        const today = new Date();

        const dd = String(today.getDate()).padStart(2, '0');

        const mm = String(today.getMonth() + 1).padStart(2, '0');

        const yyyy = today.getFullYear();



        const todayFormatted1 = \`${dd}/${mm}/${yyyy}\`;

        const todayFormatted2 = \`${yyyy}-${mm}-${dd}\`;

        const todayDayNum = today.getDate();



        const isToday = (

          tglStr === todayFormatted1 || 

          tglStr === todayFormatted2 || 

          parseInt(tglStr, 10) === todayDayNum

        );



        const rowBgClass = isToday 

          ? 'bg-amber-500/20 hover:bg-amber-500/30 border-l-4 border-l-amber-400 font-medium' 

          : 'hover:bg-white/5 border-b border-white/5';



        const keteranganText = (item.keterangan || '').toString().toUpperCase();



        return \`

          <tr class="${rowBgClass} text-xs sm:text-sm transition">

            <td class="p-2.5 sm:p-3 text-emerald-400 font-mono whitespace-nowrap">

              <div class="flex items-center gap-1.5">

                <span>${item.tglMasuk || '-'}</span>

                ${isToday ? '<span class="bg-amber-400 text-slate-950 font-bold px-1.5 py-0.5 rounded text-[10px] tracking-wider uppercase">Hari Ini</span>' : ''}

              </div>

            </td>

            <td class="p-2.5 sm:p-3 ${item.hari === 'Minggu' ? 'text-rose-400 font-semibold' : (item.hari === 'Sabtu' ? 'text-amber-400 font-semibold' : 'text-slate-200')}">${item.hari || '-'}</td>

            <td class="p-2.5 sm:p-3 text-slate-300">${item.pernerId || '-'}</td>

            <td class="p-2.5 sm:p-3 font-semibold text-blue-400">${item.shift || '-'}</td>

            <td class="p-2.5 sm:p-3 font-mono text-sky-300 whitespace-nowrap">${item.jamKerja || '-'}</td>

            <td class="p-2.5 sm:p-3 text-slate-300 whitespace-nowrap">${item.ist1 || '-'}</td>

            <td class="p-2.5 sm:p-3 text-slate-300 whitespace-nowrap">${item.ist2 || '-'}</td>

            <td class="p-2.5 sm:p-3 text-slate-300 whitespace-nowrap">${item.ist3 || '-'}</td>

            <td class="p-2.5 sm:p-3 text-slate-300">${item.ws || '-'}</td>

            <td class="p-2.5 sm:p-3 font-medium text-slate-200">${keteranganText || '-'}</td>

            ${showAllowance ? \`

            <td class="p-2.5 sm:p-3 font-medium text-center whitespace-nowrap">

              <span class="px-2.5 py-1 text-xs rounded-full font-bold ${isAllowance ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800/60 text-slate-400'}">

                ${item.shiftAllowance || 'Tidak'}

              </span>

            </td>\` : ''}

          </tr>

        \`;

      }).join('');

    }



    container.innerHTML = \`

      <div class="overflow-x-auto">

        <table class="w-full text-left border-collapse min-w-[750px] md:min-w-[900px]">

          <thead class="bg-slate-900/60 border-b border-white/10 text-xs font-semibold text-slate-300 uppercase tracking-wider">

            <tr>

              <th class="p-3">Tanggal</th>

              <th class="p-3">Hari</th>

              <th class="p-3">Perner ID</th>

              <th class="p-3">Shift</th>

              <th class="p-3">Jam Kerja</th>

              <th class="p-3">Istirahat 1</th>

              <th class="p-3">Istirahat 2</th>

              <th class="p-3">Istirahat 3</th>

              <th class="p-3">Workstation</th>

              <th class="p-3">Keterangan</th>

              ${showAllowance ? '<th class="p-3 text-center">Shift Allowance</th>' : ''}

            </tr>

          </thead>

          <tbody class="divide-y divide-white/5">${rowsHtml}</tbody>

        </table>

      </div>



      <div class="flex flex-col sm:flex-row justify-between items-center mt-4 gap-3 text-xs text-slate-400">

        <div>

          Showing ${totalEntries === 0 ? 0 : startIndex + 1} to ${endIndex} of ${totalEntries} entries

        </div>

        <div class="flex items-center space-x-1">

          <button onclick="changePage(-1)" ${currentPage === 1 ? 'disabled class="px-2.5 py-1 glass-card opacity-40 rounded-lg cursor-not-allowed"' : 'class="px-2.5 py-1 glass-card hover:bg-white/10 text-white rounded-lg transition"'}>Prev</button>

          <span class="px-3 py-1 bg-blue-600/80 text-white rounded-lg font-medium shadow-md">${currentPage}</span>

          <button onclick="changePage(1)" ${currentPage >= totalPages ? 'disabled class="px-2.5 py-1 glass-card opacity-40 rounded-lg cursor-not-allowed"' : 'class="px-2.5 py-1 glass-card hover:bg-white/10 text-white rounded-lg transition"'}>Next</button>

        </div>

      </div>

    \`;

  }



  function changePage(delta) {

    const totalPages = Math.ceil(filteredList.length / entriesPerPage) || 1;

    const targetPage = currentPage + delta;

    if (targetPage < 1 || targetPage > totalPages) return;

    currentPage = targetPage;

    renderRowsAndPaginationOnly();

  }



  function renderDashboard(summary) {

    const container = document.getElementById('content-area');

    if (!container) return;



    if (!summary) {

      container.innerHTML = \`<div class="glass-panel p-8 rounded-2xl text-center text-slate-400">Ringkasan tidak tersedia.</div>\`;

      return;

    }

    container.innerHTML = \`

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">

        <div class="glass-card p-5 sm:p-6 rounded-2xl border-l-4 border-l-blue-400">

          <h3 class="text-slate-300 text-xs font-semibold uppercase tracking-wider">Total Kerja (Monthly)</h3>

          <p class="text-2xl sm:text-3xl font-bold text-white mt-2">${summary.totalKerja || 0} Hari</p>

        </div>

        <div class="glass-card p-5 sm:p-6 rounded-2xl border-l-4 border-l-amber-400">

          <h3 class="text-slate-300 text-xs font-semibold uppercase tracking-wider">Total Off & Cuti</h3>

          <p class="text-lg sm:text-xl font-bold text-white mt-2">${summary.totalOff || 0} Off, ${summary.totalTakeOff || 0} Take Off, ${summary.totalCuti || 0} Cuti</p>

        </div>

        <div class="glass-card p-5 sm:p-6 rounded-2xl border-l-4 border-l-emerald-400">

          <h3 class="text-slate-300 text-xs font-semibold uppercase tracking-wider">Shift Allowance</h3>

          <p class="text-2xl sm:text-3xl font-bold text-white mt-2">${summary.totalAllowance || 0} Hari</p>

        </div>

      </div>

    \`;

  }



  function toggleFullscreen() {

    if (!document.fullscreenElement) {

      document.documentElement.requestFullscreen().catch(err => {

        alert(\`Gagal masuk mode fullscreen: ${err.message}\`);

      });

    } else {

      if (document.exitFullscreen) document.exitFullscreen();

    }

  }