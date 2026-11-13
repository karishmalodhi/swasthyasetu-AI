// ==========================================
// MEDIREACH - SWASTHYASETU AI
// Frontend demonstration only – sample data
// + Voice Search (Web Speech API)
// ==========================================

(function () {
  'use strict';

  const $ = id => document.getElementById(id);
  const STORAGE_KEY = 'swasthyasetu_medi_reach_requests_session';

  const facilities = [
    { id: 1, name: 'Demo General Hospital', type: 'Hospital', area: 'Sikandra, Agra', address: 'Sikandra Road, Agra', lat: 27.2196, lng: 77.9500, specialties: ['General Medicine', 'Cardiology', 'Pediatrics'], beds: { general: 18, icu: 4, oxygen: 7 }, ambulance: true },
    { id: 2, name: 'Demo City Clinic', type: 'Clinic', area: 'Civil Lines, Agra', address: 'Civil Lines, Agra', lat: 27.2050, lng: 78.0080, specialties: ['General Medicine', 'Gynecology'], beds: { general: 3, icu: 0, oxygen: 1 }, ambulance: false },
    { id: 3, name: 'Demo Community Health Centre', type: 'Health Centre', area: 'Dayalbagh, Agra', address: 'Dayalbagh, Agra', lat: 27.2200, lng: 78.0000, specialties: ['General Medicine', 'Pediatrics'], beds: { general: 8, icu: 1, oxygen: 3 }, ambulance: true },
    { id: 4, name: 'Demo Heart Clinic', type: 'Clinic', area: 'Kamla Nagar, Agra', address: 'Kamla Nagar, Agra', lat: 27.2150, lng: 78.0200, specialties: ['Cardiology'], beds: { general: 2, icu: 1, oxygen: 2 }, ambulance: false },
    { id: 5, name: 'Demo Women Care Centre', type: 'Health Centre', area: 'Shahganj, Agra', address: 'Shahganj, Agra', lat: 27.1800, lng: 78.0200, specialties: ['Gynecology'], beds: { general: 5, icu: 0, oxygen: 2 }, ambulance: false },
    { id: 6, name: 'Demo Bone Care Clinic', type: 'Clinic', area: 'Tajganj, Agra', address: 'Tajganj, Agra', lat: 27.1650, lng: 78.0450, specialties: ['Orthopedics', 'General Medicine'], beds: { general: 4, icu: 0, oxygen: 1 }, ambulance: true }
  ];

  const doctors = [
    { id: 1, name: 'Dr. Aarav Sharma', specialty: 'General Medicine', facilityId: 1, experience: '8 years', fee: 500, slots: ['09:00', '10:00', '11:00'] },
    { id: 2, name: 'Dr. Meera Gupta', specialty: 'Gynecology', facilityId: 5, experience: '10 years', fee: 800, slots: ['10:00', '12:00', '14:00'] },
    { id: 3, name: 'Dr. Rohan Verma', specialty: 'Cardiology', facilityId: 4, experience: '12 years', fee: 1200, slots: ['09:00', '11:00', '15:00'] },
    { id: 4, name: 'Dr. Neha Singh', specialty: 'Pediatrics', facilityId: 3, experience: '6 years', fee: 600, slots: ['10:00', '12:00', '16:00'] },
    { id: 5, name: 'Dr. Kabir Jain', specialty: 'Orthopedics', facilityId: 6, experience: '9 years', fee: 900, slots: ['09:00', '14:00', '16:00'] },
    { id: 6, name: 'Dr. Ananya Das', specialty: 'General Medicine', facilityId: 2, experience: '5 years', fee: 400, slots: ['09:00', '11:00', '15:00'] }
  ];

  const translations = {
    en: {
      navFacilities: 'Facilities', navDoctors: 'Doctors', navRequest: 'Request',
      navBeds: 'Beds & Ambulance', navTracking: 'Tracking', navAdmin: 'Admin',
      navHelper: 'Section helper', navHelperTitle: 'Site section helper',
      navHelperDesc: 'This tool only jumps to sections of this demo page. It does not give medical advice.',
      close: 'Close',
      heroTag: 'HEALTHCARE ACCESS MADE EASIER',
      heroTitle: 'Find Healthcare.\nGet Connected.',
      heroText: 'Discover nearby sample healthcare facilities, explore demo doctors and create demonstration requests through one platform.',
      findButton: 'Find a Hospital', heroCardTitle: 'Your Health Matters',
      heroCardText: 'Find sample facilities, explore doctors and submit demo healthcare requests.',
      demoLabel: 'DEMO PLATFORM – SAMPLE DATA ONLY',
      statFacilities: 'Demo Facilities', statDoctors: 'Demo Doctors', statRequests: 'Requests Submitted',
      facilityTag: 'HEALTHCARE DIRECTORY', facilityTitle: 'Find Nearby Hospitals',
      facilityText: 'Search sample facilities or use your location to sort by estimated distance. All data is fictional.',
      nearbyButton: '📍 Find Near Me', locationDefault: 'Location has not been shared.',
      searchPlaceholder: 'Search or click the mic to speak...',
      allTypes: 'All facility types', allSpecialties: 'All specialities',
      selectFacility: 'Select a facility to view details.',
      mapFallback: 'Map could not be loaded. Facility addresses are still shown in the list and details.',
      doctorTag: 'CONSULTATION SUPPORT', doctorTitle: 'Find a Doctor',
      doctorText: 'Explore sample doctor profiles, filter by speciality or max fee, and select available demo slots.',
      allDoctors: 'All specialities', maxFeePlaceholder: 'Max fee ₹ (optional)', filterDoctors: 'Filter',
      requestTag: 'PATIENT SUPPORT',
      requestTitle: 'Request an Appointment or Referral',
      requestText: 'Enter fictional details only. Nothing is sent to a server. Data stays in this browser session.',
      patientLabel: 'Patient Name (fictional)', phoneLabel: 'Phone Number (fictional)',
      ageLabel: 'Age', genderLabel: 'Gender', selectGender: 'Select gender',
      requestTypeLabel: 'Request Type', consultationOption: 'Consultation',
      referralOption: 'Referral', followupOption: 'Follow-up',
      facilityLabel: 'Healthcare Facility', selectFacilityOption: 'Select facility',
      specialtyLabel: 'Speciality', selectSpecialty: 'Select speciality',
      doctorLabel: 'Doctor (optional)', selectDoctor: 'Select doctor (optional)',
      dateLabel: 'Preferred Date', timeLabel: 'Preferred Time (sample slots)',
      selectTime: 'Select time', referralSourceLabel: 'Referral Source',
      notesLabel: 'Describe your request (fictional)',
      consentText: 'I agree to submit this fictional information for this demonstration only.',
      submitButton: 'Submit Demo Request',
      referralCardTag: 'DIGITAL REFERRAL – DEMO ONLY',
      demoOnlyBanner: 'DEMO ONLY – NOT A REAL REFERRAL OR CONFIRMED APPOINTMENT',
      printButton: 'Print Demo Card',
      bedsTag: 'SAMPLE CAPACITY', bedsTitle: 'Sample Bed & Ambulance Information',
      bedsText: 'Static fictional numbers for demonstration only.',
      bedsEmergency: 'This app cannot check real bed availability or dispatch ambulances. For emergencies in India call 112 directly.',
      trackingTag: 'REQUEST MANAGEMENT', trackingTitle: 'Track Your Request',
      trackingText: 'Enter your demo request ID to view its current status stored in this browser session.',
      trackButton: 'Track Request', historyTitle: 'Recent Requests on This Browser',
      clearData: 'Clear all demo data',
      emergencyTag: 'EMERGENCY SUPPORT', emergencyTitle: 'Need Emergency Help?',
      emergencyText: 'For an immediate emergency in India, call the national emergency number.',
      emergencyNote: 'Do not wait for an online appointment or referral in an emergency. This app cannot dispatch help.',
      emergencyBannerTitle: 'EMERGENCY',
      emergencyBannerText: 'This is a demonstration app only. It cannot dispatch ambulances or confirm real appointments. For medical emergencies in India call',
      adminTag: 'FACILITY MANAGEMENT', adminTitle: 'Hospital Admin Dashboard',
      adminText: 'Local demo dashboard to review requests and change their status. Data never leaves this browser.',
      adminWarning: 'Demo only: this dashboard has no authentication and is not connected to a real hospital.',
      adminTotal: 'Total Requests', adminPending: 'Received',
      adminAccepted: 'Accepted', adminCompleted: 'Completed',
      tableId: 'Request ID', tablePatient: 'Patient', tableFacility: 'Facility',
      tableType: 'Type', tableStatus: 'Status', tableAction: 'Update Status',
      footerText: 'Connecting people with healthcare services – demonstration only.',
      footerNote: 'Educational demonstration only. Sample data. Not an actual medical booking or dispatch service.'
    },
    hi: {
      navFacilities: 'स्वास्थ्य केंद्र', navDoctors: 'डॉक्टर', navRequest: 'अनुरोध',
      navBeds: 'बेड और एम्बुलेंस', navTracking: 'स्थिति देखें', navAdmin: 'एडमिन',
      navHelper: 'अनुभाग सहायक', navHelperTitle: 'साइट अनुभाग सहायक',
      navHelperDesc: 'यह टूल केवल इस डेमो पेज के अनुभागों पर जाता है। यह चिकित्सा सलाह नहीं देता।',
      close: 'बंद करें',
      heroTag: 'स्वास्थ्य सेवाओं तक आसान पहुंच',
      heroTitle: 'स्वास्थ्य सेवा खोजें।\nजुड़ें।',
      heroText: 'नजदीकी नमूना स्वास्थ्य केंद्र खोजें, डेमो डॉक्टर देखें और प्रदर्शन अनुरोध बनाएं।',
      findButton: 'अस्पताल खोजें', heroCardTitle: 'आपका स्वास्थ्य महत्वपूर्ण है',
      heroCardText: 'नमूना केंद्र खोजें और डेमो सहायता का अनुरोध करें।',
      demoLabel: 'डेमो प्लेटफॉर्म – केवल नमूना डेटा',
      statFacilities: 'डेमो केंद्र', statDoctors: 'डेमो डॉक्टर', statRequests: 'कुल अनुरोध',
      facilityTag: 'स्वास्थ्य केंद्र सूची', facilityTitle: 'नजदीकी अस्पताल खोजें',
      facilityText: 'नमूना केंद्र खोजें या अनुमानित दूरी के अनुसार क्रमबद्ध करने के लिए लोकेशन साझा करें। सभी डेटा काल्पनिक है।',
      nearbyButton: '📍 मेरे पास खोजें', locationDefault: 'लोकेशन साझा नहीं की गई है।',
      searchPlaceholder: 'खोजें या माइक पर क्लिक करके बोलें...',
      allTypes: 'सभी केंद्र', allSpecialties: 'सभी विशेषज्ञताएं',
      selectFacility: 'विवरण देखने के लिए केंद्र चुनें।',
      mapFallback: 'मानचित्र लोड नहीं हो सका।',
      doctorTag: 'परामर्श सहायता', doctorTitle: 'डॉक्टर खोजें',
      doctorText: 'नमूना डॉक्टर प्रोफाइल देखें, विशेषज्ञता या अधिकतम शुल्क से फ़िल्टर करें।',
      allDoctors: 'सभी विशेषज्ञताएं', maxFeePlaceholder: 'अधिकतम शुल्क ₹ (वैकल्पिक)', filterDoctors: 'फ़िल्टर',
      requestTag: 'मरीज सहायता',
      requestTitle: 'अपॉइंटमेंट या रेफरल अनुरोध करें',
      requestText: 'केवल काल्पनिक विवरण दर्ज करें। सर्वर पर कुछ नहीं भेजा जाता।',
      patientLabel: 'मरीज का नाम (काल्पनिक)', phoneLabel: 'फोन नंबर (काल्पनिक)',
      ageLabel: 'आयु', genderLabel: 'लिंग', selectGender: 'लिंग चुनें',
      requestTypeLabel: 'अनुरोध का प्रकार', consultationOption: 'परामर्श',
      referralOption: 'रेफरल', followupOption: 'फॉलो-अप',
      facilityLabel: 'स्वास्थ्य केंद्र', selectFacilityOption: 'केंद्र चुनें',
      specialtyLabel: 'विशेषज्ञता', selectSpecialty: 'विशेषज्ञता चुनें',
      doctorLabel: 'डॉक्टर (वैकल्पिक)', selectDoctor: 'डॉक्टर चुनें (वैकल्पिक)',
      dateLabel: 'पसंदीदा तारीख', timeLabel: 'पसंदीदा समय (नमूना स्लॉट)',
      selectTime: 'समय चुनें', referralSourceLabel: 'रेफरल देने वाला केंद्र',
      notesLabel: 'अपना अनुरोध बताएं (काल्पनिक)',
      consentText: 'मैं इस डेमो के लिए काल्पनिक जानकारी जमा करने की सहमति देता/देती हूं।',
      submitButton: 'डेमो अनुरोध जमा करें',
      referralCardTag: 'डिजिटल रेफरल – केवल डेमो',
      demoOnlyBanner: 'केवल डेमो – वास्तविक रेफरल या पुष्टि अपॉइंटमेंट नहीं',
      printButton: 'डेमो कार्ड प्रिंट करें',
      bedsTag: 'नमूना क्षमता', bedsTitle: 'नमूना बेड और एम्बुलेंस जानकारी',
      bedsText: 'केवल प्रदर्शन के लिए स्थिर काल्पनिक आंकड़े।',
      bedsEmergency: 'यह ऐप वास्तविक बेड उपलब्धता नहीं जांच सकता। आपात स्थिति में 112 पर कॉल करें।',
      trackingTag: 'अनुरोध प्रबंधन', trackingTitle: 'अनुरोध की स्थिति देखें',
      trackingText: 'डेमो स्थिति देखने के लिए अनुरोध ID डालें।',
      trackButton: 'स्थिति देखें', historyTitle: 'इस ब्राउज़र के हाल के अनुरोध',
      clearData: 'सभी डेमो डेटा साफ़ करें',
      emergencyTag: 'आपातकालीन सहायता', emergencyTitle: 'आपातकालीन मदद चाहिए?',
      emergencyText: 'भारत में तत्काल आपातकाल के लिए 112 पर कॉल करें।',
      emergencyNote: 'आपातकाल में ऑनलाइन अपॉइंटमेंट का इंतजार न करें।',
      emergencyBannerTitle: 'आपातकाल',
      emergencyBannerText: 'यह केवल प्रदर्शन ऐप है। आपात स्थिति में कॉल करें',
      adminTag: 'केंद्र प्रबंधन', adminTitle: 'अस्पताल एडमिन डैशबोर्ड',
      adminText: 'डेमो अनुरोध देखें और स्थिति बदलें।',
      adminWarning: 'केवल डेमो: कोई लॉगिन या वास्तविक अस्पताल नहीं।',
      adminTotal: 'कुल अनुरोध', adminPending: 'प्राप्त',
      adminAccepted: 'स्वीकृत', adminCompleted: 'पूर्ण',
      tableId: 'अनुरोध ID', tablePatient: 'मरीज', tableFacility: 'केंद्र',
      tableType: 'प्रकार', tableStatus: 'स्थिति', tableAction: 'स्थिति बदलें',
      footerText: 'लोगों को स्वास्थ्य सेवाओं से जोड़ना – केवल प्रदर्शन।',
      footerNote: 'केवल शैक्षिक डेमो। नमूना डेटा।'
    }
  };

  let currentLanguage = 'en';
  let selectedFacility = null;
  let userPosition = null;
  let map = null;
  let markerLayer = null;
  let userMarker = null;
  let mapAvailable = typeof L !== 'undefined';
  let recognition = null;
  let isListening = false;

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[char]);
  }

  function getRequests() {
    try { return JSON.parse(sessionStorage.getItem(STORAGE_KEY)) || []; }
    catch { return []; }
  }
  function saveRequests(requests) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(requests));
  }
  function t(key) {
    return (translations[currentLanguage] && translations[currentLanguage][key]) || translations.en[key] || key;
  }

  // ---------- Voice Search ----------
  function initVoiceSearch() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const statusEl = $('voiceStatus');
    const btn = $('voiceSearchBtn');

    if (!SpeechRecognition) {
      statusEl.textContent = 'Voice search not supported in this browser. Try Chrome or Edge.';
      statusEl.className = 'voice-status error';
      btn.disabled = true;
      btn.title = 'Voice search not supported';
      return;
    }

    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';

    recognition.onstart = () => {
      isListening = true;
      btn.classList.add('listening');
      statusEl.textContent = currentLanguage === 'hi' ? 'सुन रहा हूँ… बोलिए' : 'Listening… Speak now';
      statusEl.className = 'voice-status listening';
    };

    recognition.onresult = (event) => {
      let transcript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      $('searchInput').value = transcript;
      statusEl.textContent = (currentLanguage === 'hi' ? 'सुना: ' : 'Heard: ') + transcript;

      if (event.results[event.results.length - 1].isFinal) {
        applySmartSearch(transcript);
      }
    };

    recognition.onerror = (event) => {
      isListening = false;
      btn.classList.remove('listening');
      const msg = {
        'no-speech': 'No speech detected. Try again.',
        'audio-capture': 'Microphone not available.',
        'not-allowed': 'Microphone permission denied. Allow mic access.',
        'network': 'Network error occurred.'
      }[event.error] || 'Voice recognition error. Try again.';
      statusEl.textContent = msg;
      statusEl.className = 'voice-status error';
    };

    recognition.onend = () => {
      isListening = false;
      btn.classList.remove('listening');
      if (statusEl.classList.contains('listening')) {
        statusEl.textContent = currentLanguage === 'hi' ? 'सुनना बंद' : 'Listening stopped';
        statusEl.className = 'voice-status';
      }
    };

    btn.addEventListener('click', () => {
      if (isListening) {
        recognition.stop();
        return;
      }
      recognition.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-IN';
      try {
        recognition.start();
      } catch (e) {
        statusEl.textContent = 'Could not start voice recognition.';
        statusEl.className = 'voice-status error';
      }
    });
  }

  // Smart parser for voice / text queries
  function applySmartSearch(query) {
    const q = (query || '').toLowerCase().trim();
    if (!q) return;

    // Detect speciality
    const specialtyMap = {
      'cardio': 'Cardiology', 'heart': 'Cardiology', 'हृदय': 'Cardiology',
      'gyne': 'Gynecology', 'gynae': 'Gynecology', 'woman': 'Gynecology', 'महिला': 'Gynecology',
      'pedia': 'Pediatrics', 'child': 'Pediatrics', 'बच्चा': 'Pediatrics', 'kids': 'Pediatrics',
      'ortho': 'Orthopedics', 'bone': 'Orthopedics', 'हड्डी': 'Orthopedics',
      'general': 'General Medicine', 'medicine': 'General Medicine'
    };
    let detectedSpecialty = '';
    for (const [key, val] of Object.entries(specialtyMap)) {
      if (q.includes(key)) { detectedSpecialty = val; break; }
    }

    // Detect type
    let detectedType = '';
    if (q.includes('hospital') || q.includes('अस्पताल')) detectedType = 'Hospital';
    else if (q.includes('clinic') || q.includes('क्लिनिक')) detectedType = 'Clinic';
    else if (q.includes('health centre') || q.includes('centre') || q.includes('केंद्र')) detectedType = 'Health Centre';

    // Detect max fee
    const feeMatch = q.match(/(?:under|below|max|less than|से कम|तक)\s*₹?\s*(\d{3,5})/i) ||
                     q.match(/₹\s*(\d{3,5})/) ||
                     q.match(/(\d{3,5})\s*(?:rupees|rs|₹)/i);
    const maxFee = feeMatch ? parseInt(feeMatch[1], 10) : null;

    // Apply to filters
    if (detectedSpecialty) {
      $('specialtyFilter').value = detectedSpecialty;
      $('doctorSpecialtyFilter').value = detectedSpecialty;
    }
    if (detectedType) $('typeFilter').value = detectedType;
    if (maxFee) $('feeMax').value = maxFee;

    // Trigger near me if spoken
    if (q.includes('near me') || q.includes('nearby') || q.includes('मेरे पास') || q.includes('नजदीक')) {
      $('nearbyButton').click();
    }

    renderFacilities();
    renderDoctors();

    // Scroll to results
    $('facilities').scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ---------- Language ----------
  function setLanguage(language) {
    currentLanguage = language;
    document.documentElement.lang = language;
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.dataset.i18n;
      const val = t(key);
      if (val) {
        if (key === 'heroTitle') el.innerHTML = val.replace(/\n/g, '<br>');
        else el.textContent = val;
      }
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      el.placeholder = t(el.dataset.i18nPlaceholder);
    });
    $('languageToggle').textContent = language === 'en' ? 'हिन्दी' : 'English';
    if (recognition) recognition.lang = language === 'hi' ? 'hi-IN' : 'en-IN';
    renderFacilities();
    renderDoctors();
    renderBeds();
    renderHistory();
    renderAdmin();
    renderTracking();
    updateStats();
    populateFacilities();
    populateDoctors();
    populateDefaultTimes();
  }

  // ---------- Map ----------
  function initMap() {
    const mapEl = $('map');
    const fallback = $('mapFallback');
    if (!mapAvailable) {
      mapEl.style.display = 'none';
      fallback.classList.remove('hidden');
      return;
    }
    try {
      map = L.map('map').setView([27.195, 78.010], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors', maxZoom: 18
      }).addTo(map);
      markerLayer = L.layerGroup().addTo(map);
      fallback.classList.add('hidden');
    } catch (e) {
      mapAvailable = false;
      mapEl.style.display = 'none';
      fallback.classList.remove('hidden');
    }
  }

  function distanceKm(lat1, lon1, lat2, lon2) {
    const toRad = v => v * Math.PI / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function getSortedFacilities(list) {
    if (!userPosition) return list;
    return [...list].sort((a, b) =>
      distanceKm(userPosition.lat, userPosition.lng, a.lat, a.lng) -
      distanceKm(userPosition.lat, userPosition.lng, b.lat, b.lng)
    );
  }

  function setupNearby() {
    $('nearbyButton').addEventListener('click', () => {
      if (!navigator.geolocation) {
        $('locationMessage').textContent = 'Location is not supported by this browser.';
        return;
      }
      $('locationMessage').textContent = 'Requesting your location…';
      navigator.geolocation.getCurrentPosition(pos => {
        userPosition = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        $('locationMessage').textContent = 'Location found. Facilities sorted by estimated distance.';
        if (map && mapAvailable) {
          if (userMarker) map.removeLayer(userMarker);
          userMarker = L.marker([userPosition.lat, userPosition.lng]).addTo(map).bindPopup('Your approximate location');
          map.setView([userPosition.lat, userPosition.lng], 12);
        }
        renderFacilities();
      }, err => {
        const messages = { 1: 'Location permission denied.', 2: 'Location unavailable.', 3: 'Location request timed out.' };
        $('locationMessage').textContent = messages[err.code] || 'Unable to get location.';
      }, { enableHighAccuracy: true, timeout: 10000 });
    });
  }

  // ---------- Facilities ----------
  function renderFacilities() {
    const search = ($('searchInput').value || '').toLowerCase().trim();
    const type = $('typeFilter').value;
    const specialty = $('specialtyFilter').value;

    let filtered = facilities.filter(f => {
      const text = `${f.name} ${f.area} ${f.specialties.join(' ')}`.toLowerCase();
      return text.includes(search) && (!type || f.type === type) && (!specialty || f.specialties.includes(specialty));
    });
    filtered = getSortedFacilities(filtered);

    $('facilityList').innerHTML = filtered.length
      ? filtered.map(f => {
          const distance = userPosition
            ? `<span class="distance-label">${distanceKm(userPosition.lat, userPosition.lng, f.lat, f.lng).toFixed(1)} km</span>` : '';
          return `<article class="facility-card ${selectedFacility === f.id ? 'active' : ''}" data-id="${f.id}" tabindex="0">
            <h3>${escapeHTML(f.name)}</h3>
            <p>📍 ${escapeHTML(f.area)} ${distance}</p>
            <p>${escapeHTML(f.specialties.join(', '))}</p>
            <span class="facility-type">${escapeHTML(f.type)}</span>
          </article>`;
        }).join('')
      : '<p>No matching demo facilities found.</p>';

    if (markerLayer && mapAvailable) {
      markerLayer.clearLayers();
      filtered.forEach(f => {
        const marker = L.marker([f.lat, f.lng]).addTo(markerLayer);
        marker.bindPopup(`<b>${escapeHTML(f.name)}</b><br>${escapeHTML(f.area)}`);
        marker.on('click', () => selectFacility(f.id));
      });
    }
  }

  function selectFacility(id) {
    const facility = facilities.find(f => f.id === id);
    if (!facility) return;
    selectedFacility = id;
    $('facilityDetails').innerHTML = `
      <h3>${escapeHTML(facility.name)}</h3>
      <p><b>Type:</b> ${escapeHTML(facility.type)}</p>
      <p><b>Address (sample):</b> ${escapeHTML(facility.address)}</p>
      <p><b>Specialities:</b> ${escapeHTML(facility.specialties.join(', '))}</p>
      <button id="chooseFacility" class="primary-btn" type="button">Choose This Facility</button>`;
    $('facilitySelect').value = String(id);
    const chooseBtn = $('chooseFacility');
    if (chooseBtn) {
      chooseBtn.addEventListener('click', () => {
        $('request').scrollIntoView({ behavior: 'smooth' });
        $('facilitySelect').value = String(id);
      });
    }
    renderFacilities();
  }

  function setupFacilityEvents() {
    $('facilityList').addEventListener('click', e => {
      const card = e.target.closest('.facility-card');
      if (card) selectFacility(Number(card.dataset.id));
    });
    $('facilityList').addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        const card = e.target.closest('.facility-card');
        if (card) { e.preventDefault(); selectFacility(Number(card.dataset.id)); }
      }
    });
    ['searchInput', 'typeFilter', 'specialtyFilter'].forEach(id => {
      $(id).addEventListener('input', renderFacilities);
      $(id).addEventListener('change', renderFacilities);
    });
    $('searchInput').addEventListener('keydown', e => {
      if (e.key === 'Enter') applySmartSearch($('searchInput').value);
    });
    $('facilitySelect').addEventListener('change', e => {
      if (e.target.value) selectFacility(Number(e.target.value));
    });
  }

  function populateFacilities() {
    $('facilitySelect').innerHTML = `<option value="">${t('selectFacilityOption')}</option>` +
      facilities.map(f => `<option value="${f.id}">${escapeHTML(f.name)}</option>`).join('');
  }

  // ---------- Doctors ----------
  function getFilteredDoctors() {
    const specialty = $('doctorSpecialtyFilter').value;
    const maxFee = parseFloat($('feeMax').value);
    return doctors.filter(d => {
      const matchSpec = !specialty || d.specialty === specialty;
      const matchFee = isNaN(maxFee) || d.fee <= maxFee;
      return matchSpec && matchFee;
    });
  }

  function renderDoctors() {
    const filtered = getFilteredDoctors();
    $('doctorList').innerHTML = filtered.map(d => {
      const facility = facilities.find(f => f.id === d.facilityId);
      return `<article class="doctor-card">
        <div class="doctor-avatar" aria-hidden="true">👨‍⚕️</div>
        <h3>${escapeHTML(d.name)}</h3>
        <p>${escapeHTML(d.specialty)}</p>
        <p>${escapeHTML(d.experience)} experience (sample profile)</p>
        <p>📍 ${escapeHTML(facility ? facility.name : '')}</p>
        <p class="fee">Consultation fee (sample): ₹${d.fee}</p>
        <p class="availability">Demo slots: ${d.slots.map(s => escapeHTML(s)).join(' | ')}</p>
        <button class="primary-btn choose-doctor" data-id="${d.id}" type="button">Select Doctor</button>
      </article>`;
    }).join('') || '<p>No matching sample doctors.</p>';
  }

  function populateDoctors() {
    $('doctorSelect').innerHTML = `<option value="">${t('selectDoctor')}</option>` +
      doctors.map(d => `<option value="${d.id}">${escapeHTML(d.name)} – ${escapeHTML(d.specialty)}</option>`).join('');
  }

  function populateSlotsForDoctor(doctorId) {
    const sel = $('preferredTime');
    sel.innerHTML = `<option value="">${t('selectTime')}</option>`;
    if (!doctorId) {
      ['09:00','10:00','11:00','12:00','14:00','15:00','16:00'].forEach(s => {
        const opt = document.createElement('option');
        opt.value = s; opt.textContent = s;
        sel.appendChild(opt);
      });
      return;
    }
    const doctor = doctors.find(d => d.id === Number(doctorId));
    if (!doctor) return;
    doctor.slots.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s; opt.textContent = s;
      sel.appendChild(opt);
    });
  }

  function populateDefaultTimes() { populateSlotsForDoctor(null); }

  function setupDoctorEvents() {
    $('doctorSpecialtyFilter').addEventListener('change', renderDoctors);
    $('filterDoctorsBtn').addEventListener('click', renderDoctors);
    $('feeMax').addEventListener('change', renderDoctors);

    $('doctorList').addEventListener('click', e => {
      const btn = e.target.closest('.choose-doctor');
      if (!btn) return;
      const doctor = doctors.find(d => d.id === Number(btn.dataset.id));
      if (!doctor) return;
      $('doctorSelect').value = String(doctor.id);
      $('specialty').value = doctor.specialty;
      $('facilitySelect').value = String(doctor.facilityId);
      selectFacility(doctor.facilityId);
      populateSlotsForDoctor(doctor.id);
      $('request').scrollIntoView({ behavior: 'smooth' });
    });

    $('doctorSelect').addEventListener('change', e => {
      const doctor = doctors.find(d => d.id === Number(e.target.value));
      if (!doctor) { populateSlotsForDoctor(null); return; }
      $('specialty').value = doctor.specialty;
      $('facilitySelect').value = String(doctor.facilityId);
      selectFacility(doctor.facilityId);
      populateSlotsForDoctor(doctor.id);
    });

    $('specialty').addEventListener('change', () => {
      const doctor = doctors.find(d => d.id === Number($('doctorSelect').value));
      if (doctor && doctor.specialty !== $('specialty').value) {
        $('doctorSelect').value = '';
        populateSlotsForDoctor(null);
      }
    });
  }

  // ---------- Beds ----------
  function renderBeds() {
    $('bedsList').innerHTML = facilities.map(f => `
      <article class="bed-card">
        <h3>${escapeHTML(f.name)}</h3>
        <p>General beds (sample): ${f.beds.general}</p>
        <p>ICU beds (sample): ${f.beds.icu}</p>
        <p>Oxygen beds (sample): ${f.beds.oxygen}</p>
        <p>${f.ambulance ? 'Sample ambulance listed' : 'No sample ambulance listed'}</p>
      </article>`).join('');
  }

  // ---------- Request form ----------
  function setupRequestForm() {
    $('requestType').addEventListener('change', e => {
      const isReferral = e.target.value === 'Referral';
      $('referralGroup').classList.toggle('hidden', !isReferral);
      $('referralSource').required = isReferral;
    });

    const today = new Date();
    const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
    $('preferredDate').min = localToday;

    $('requestForm').addEventListener('submit', e => {
      e.preventDefault();
      $('err-name').textContent = '';
      $('err-phone').textContent = '';
      $('err-facility').textContent = '';
      $('formMessage').textContent = '';
      $('formMessage').className = '';

      const name = $('patientName').value.trim();
      const phone = $('phone').value.trim();
      const facilityId = $('facilitySelect').value;
      let valid = true;

      if (!name) { $('err-name').textContent = 'Name is required.'; valid = false; }
      if (!/^\d{10}$/.test(phone)) { $('err-phone').textContent = 'Enter a 10-digit fictional phone number.'; valid = false; }
      if (!facilityId) { $('err-facility').textContent = 'Please select a sample facility.'; valid = false; }
      if (!$('consent').checked) {
        $('formMessage').textContent = 'Please accept the demonstration consent.';
        $('formMessage').className = 'error';
        valid = false;
      }
      if (!valid) {
        $('formMessage').textContent = $('formMessage').textContent || 'Please fix the errors above.';
        $('formMessage').className = 'error';
        return;
      }

      const facility = facilities.find(f => f.id === Number(facilityId));
      const doctor = doctors.find(d => d.id === Number($('doctorSelect').value));
      const time = $('preferredTime').value;

      if (doctor) {
        if (doctor.facilityId !== facility.id || doctor.specialty !== $('specialty').value) {
          $('formMessage').textContent = 'Please select a doctor matching the facility and speciality.';
          $('formMessage').className = 'error';
          return;
        }
        if (!doctor.slots.includes(time)) {
          $('formMessage').textContent = 'This demo doctor does not list that time slot.';
          $('formMessage').className = 'error';
          return;
        }
      }

      const request = {
        id: 'MR-' + Date.now().toString().slice(-10) + '-' + Math.floor(100 + Math.random() * 900),
        name, phone,
        age: $('age').value,
        gender: $('gender').value,
        type: $('requestType').value,
        facility: facility.name,
        facilityId: facility.id,
        specialty: $('specialty').value,
        doctor: doctor ? doctor.name : 'Not selected',
        date: $('preferredDate').value,
        time,
        referralSource: $('referralSource').value.trim(),
        notes: $('notes').value.trim(),
        status: 'Received',
        createdAt: new Date().toLocaleString()
      };

      const requests = getRequests();
      requests.unshift(request);
      saveRequests(requests);

      $('formMessage').textContent = `Demo request created successfully. Request ID: ${request.id}`;
      $('formMessage').className = 'success';
      $('trackingId').value = request.id;
      showReferralCard(request);

      $('requestForm').reset();
      $('referralGroup').classList.add('hidden');
      $('referralSource').required = false;
      populateFacilities();
      populateDoctors();
      populateDefaultTimes();
      renderHistory();
      renderAdmin();
      updateStats();
      renderTracking();
    });
  }

  function showReferralCard(request) {
    $('referralContent').innerHTML = `
      <p><b>Referral / Request ID:</b> ${escapeHTML(request.id)}</p>
      <p><b>Patient:</b> ${escapeHTML(request.name)}</p>
      <p><b>Facility:</b> ${escapeHTML(request.facility)}</p>
      <p><b>Speciality:</b> ${escapeHTML(request.specialty)}</p>
      <p><b>Doctor:</b> ${escapeHTML(request.doctor)}</p>
      <p><b>Date:</b> ${escapeHTML(request.date)}</p>
      <p><b>Time:</b> ${escapeHTML(request.time)}</p>
      <p><b>Request type:</b> ${escapeHTML(request.type)}</p>
      <p><b>Status:</b> ${escapeHTML(request.status)}</p>
      <p style="color:#64777b;font-size:13px;">Demo document only. This is not a medical referral or confirmed appointment.</p>`;
    $('referralCard').classList.remove('hidden');
  }

  // ---------- Tracking ----------
  const statusStages = ['Received', 'Under Review', 'Accepted', 'Completed'];

  function renderTracking() {
    const id = ($('trackingId').value || '').trim().toUpperCase();
    if (!id) { $('trackingResult').innerHTML = ''; return; }
    const request = getRequests().find(r => r.id === id);
    if (!request) {
      $('trackingResult').textContent = 'Request not found in this browser session.';
      return;
    }
    const currentIndex = statusStages.indexOf(request.status);
    $('trackingResult').innerHTML = `
      <div class="history-item">
        <h3>${escapeHTML(request.id)}</h3>
        <p><b>Patient:</b> ${escapeHTML(request.name)}</p>
        <p><b>Facility:</b> ${escapeHTML(request.facility)}</p>
        <p><b>Request:</b> ${escapeHTML(request.type)}</p>
        <p><b>Current status:</b> ${escapeHTML(request.status)}</p>
        <div class="progress-track">
          ${statusStages.map((stage, index) => `
            <div class="progress-step ${index <= currentIndex ? 'done' : ''}">
              <div class="circle">${index <= currentIndex ? '✓' : index + 1}</div>
              ${escapeHTML(stage)}
            </div>`).join('')}
        </div>
        <p><small>Submitted: ${escapeHTML(request.createdAt)}</small></p>
      </div>`;
  }

  function setupTracking() {
    $('trackButton').addEventListener('click', renderTracking);
    $('trackingId').addEventListener('keydown', e => { if (e.key === 'Enter') renderTracking(); });
  }

  function renderHistory() {
    const requests = getRequests();
    $('requestHistory').innerHTML = requests.length
      ? requests.map(r => `
        <div class="history-item">
          <h3>${escapeHTML(r.id)}</h3>
          <p>${escapeHTML(r.facility)} | ${escapeHTML(r.type)}</p>
          <p>Status: ${escapeHTML(r.status)}</p>
        </div>`).join('')
      : '<p>No demo requests submitted yet in this session.</p>';
  }

  function renderAdmin() {
    const requests = getRequests();
    $('adminTotal').textContent = requests.length;
    $('adminPending').textContent = requests.filter(r => r.status === 'Received').length;
    $('adminAccepted').textContent = requests.filter(r => r.status === 'Accepted').length;
    $('adminCompleted').textContent = requests.filter(r => r.status === 'Completed').length;

    $('adminTableBody').innerHTML = requests.length
      ? requests.map(r => `
        <tr>
          <td>${escapeHTML(r.id)}</td>
          <td>${escapeHTML(r.name)}</td>
          <td>${escapeHTML(r.facility)}</td>
          <td>${escapeHTML(r.type)}</td>
          <td>${escapeHTML(r.status)}</td>
          <td>
            <select class="status-select" data-id="${escapeHTML(r.id)}">
              ${statusStages.map(status =>
                `<option value="${status}" ${r.status === status ? 'selected' : ''}>${status}</option>`
              ).join('')}
            </select>
          </td>
        </tr>`).join('')
      : '<tr><td colspan="6">No demo requests available.</td></tr>';
  }

  function setupAdmin() {
    $('adminTableBody').addEventListener('change', e => {
      const select = e.target.closest('.status-select');
      if (!select) return;
      const requests = getRequests();
      const request = requests.find(r => r.id === select.dataset.id);
      if (!request) return;
      request.status = select.value;
      saveRequests(requests);
      renderAdmin();
      renderHistory();
      renderTracking();
      updateStats();
    });
  }

  function updateStats() {
    $('facilityCount').textContent = facilities.length;
    $('doctorCount').textContent = doctors.length;
    $('requestCount').textContent = getRequests().length;
  }

  function setupClear() {
    $('clearDemoData').addEventListener('click', () => {
      sessionStorage.removeItem(STORAGE_KEY);
      renderHistory();
      renderAdmin();
      updateStats();
      $('trackingResult').innerHTML = '';
      $('referralCard').classList.add('hidden');
      $('formMessage').textContent = 'All demo data cleared from this session.';
      $('formMessage').className = 'success';
    });
  }

  function setupNavHelper() {
    $('navHelperBtn').addEventListener('click', () => $('navHelperPanel').classList.toggle('hidden'));
    $('closeHelper').addEventListener('click', () => $('navHelperPanel').classList.add('hidden'));
    document.querySelectorAll('.jump-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = document.getElementById(btn.dataset.target);
        if (target) target.scrollIntoView({ behavior: 'smooth' });
        $('navHelperPanel').classList.add('hidden');
      });
    });
  }

  // ---------- Init ----------
  function init() {
    initMap();
    initVoiceSearch();
    populateFacilities();
    populateDoctors();
    populateDefaultTimes();
    renderFacilities();
    renderDoctors();
    renderBeds();
    renderHistory();
    renderAdmin();
    updateStats();

    setupNearby();
    setupFacilityEvents();
    setupDoctorEvents();
    setupRequestForm();
    setupTracking();
    setupAdmin();
    setupClear();
    setupNavHelper();

    $('languageToggle').addEventListener('click', () => {
      setLanguage(currentLanguage === 'en' ? 'hi' : 'en');
    });
    $('printReferral').addEventListener('click', () => window.print());

    setLanguage('en');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();