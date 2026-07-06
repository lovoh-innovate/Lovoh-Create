// screens/EventDashboardEditEvent.jsx – Redesigned to match Create Event UI
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FaArrowLeft, FaSave, FaCalendarAlt, FaClock, FaMapMarkerAlt,
  FaTag, FaDollarSign, FaImage, FaTrashAlt, FaPlus,
  FaBold, FaItalic, FaUnderline, FaAlignLeft, FaAlignCenter, FaAlignRight,
  FaHeading, FaEye,
  FaVideo, FaTicketAlt, FaTimes, FaUser, FaCamera,
  FaClipboardList, FaCheckSquare, FaDotCircle, FaFont, FaHashtag,
  FaCalendar, FaEnvelope, FaPhone, FaChevronDown, FaChevronUp,
  FaInfoCircle, FaPaintBrush, FaArrowsAlt, FaPen,
  FaFileImage, FaChevronLeft, FaChevronRight, FaCheck, FaSpinner,
  FaListUl, FaListOl, FaLink, FaQuoteRight, FaExclamationCircle, FaSyncAlt,
  FaStar, FaRegStar, FaUsers, FaMagic
} from 'react-icons/fa';
import {
  useGetEventByIdQuery,
  useUpdateEventMutation,
  useGetEventCustomFormQuery,
  useUpdateEventCustomFormMutation
} from '../slices/eventApiSlice';
import { toast } from 'react-toastify';
import EventDashboardSidebar from '../components/EventDashboardSidebar';

const FIELD_TYPES = [
  { value: 'text', label: 'Short Text', icon: FaFont },
  { value: 'textarea', label: 'Long Text', icon: FaAlignLeft },
  { value: 'number', label: 'Number', icon: FaHashtag },
  { value: 'email', label: 'Email', icon: FaEnvelope },
  { value: 'phone', label: 'Phone', icon: FaPhone },
  { value: 'date', label: 'Date', icon: FaCalendar },
  { value: 'dropdown', label: 'Dropdown', icon: FaChevronDown },
  { value: 'checkbox', label: 'Checkbox', icon: FaCheckSquare },
  { value: 'radio', label: 'Radio', icon: FaDotCircle },
];

const SAMPLE_BACKGROUNDS = [
  { label: 'Gradient', url: 'https://images.unsplash.com/photo-1540575861501-7cf05a4b125a?auto=format&fit=crop&w=600&q=80' },
  { label: 'City', url: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=600&q=80' },
  { label: 'Abstract', url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=600&q=80' },
  { label: 'Minimal', url: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=600&q=80' },
];

const SECTIONS = [
  { id: 'basic', label: 'Basic Info', icon: FaInfoCircle },
  { id: 'details', label: 'Date & Location', icon: FaCalendarAlt },
  { id: 'description', label: 'Description', icon: FaFileImage },
  { id: 'media', label: 'Images', icon: FaImage },
  { id: 'tickets', label: 'Tickets', icon: FaTicketAlt },
  { id: 'speakers', label: 'Speakers', icon: FaUser },
  { id: 'form', label: 'Custom Form', icon: FaClipboardList },
  { id: 'poster', label: 'Poster', icon: FaPaintBrush },
];

const EventDashboardEditEvent = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const editorRef = useRef(null);

  const { data: event, isLoading: isLoadingEvent } = useGetEventByIdQuery(id);
  const [updateEvent, { isLoading: isUpdating }] = useUpdateEventMutation();
  const { data: customFormData, isLoading: isLoadingForm } = useGetEventCustomFormQuery(id);
  const [updateCustomForm, { isLoading: isUpdatingForm }] = useUpdateEventCustomFormMutation();

  // State
  const [description, setDescription] = useState("");
  const [previewMode, setPreviewMode] = useState(false);
  const [hasTicketTypes, setHasTicketTypes] = useState(false);
  const [enableMultipleTickets, setEnableMultipleTickets] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [showReloadInstruction, setShowReloadInstruction] = useState(false);

  // Active states for toolbar buttons
  const [activeStates, setActiveStates] = useState({
    bold: false,
    italic: false,
    underline: false,
    justifyLeft: false,
    justifyCenter: false,
    justifyRight: false,
  });

  const categories = [
    "Business", "Technology", "Lifestyle", "Education", "Entertainment",
    "Art & Culture", "Health & Wellness", "Sports", "Food & Drink",
    "Networking", "Career Development", "Faith & Spirituality",
    "Fashion & Beauty", "Music", "Film & Media", "Travel",
    "Real Estate", "Finance", "Agriculture", "Other"
  ];

  const eventTypes = [
    "Conference", "Workshop", "Seminar", "Webinar", "Networking",
    "Training", "Meetup", "Panel Discussion", "Keynote", "Hackathon",
    "Awards Ceremony", "Product Launch", "Fundraiser", "Exhibition",
    "Masterclass", "Bootcamp", "Retreat", "Gala", "Competition", "Other"
  ];

  const [formData, setFormData] = useState({
    title: "", category: "", eventType: "", date: "", time: "",
    duration: "", location: "", venue: "", isVirtual: false,
    meetingLink: "", isPaid: false, price: "", maxAttendees: "",
    registrationDeadline: "", featured: false, tags: "", maxTicketsPerOrder: 10,
  });

  const [existingImages, setExistingImages] = useState([]);
  const [imagesToKeep, setImagesToKeep] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [newImagePreviews, setNewImagePreviews] = useState([]);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [speakers, setSpeakers] = useState([]);
  const [speakerFiles, setSpeakerFiles] = useState({});

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formFields, setFormFields] = useState([]);
  const [formChanged, setFormChanged] = useState(false);

  // Poster state
  const [posterTemplate, setPosterTemplate] = useState({
    image: '',
    photoPlaceholder: { x: 100, y: 150, width: 200, height: 200, borderRadius: 0 },
    namePlaceholder: { x: 100, y: 400, fontSize: 48, color: '#FFFFFF', fontFamily: 'Arial' },
  });
  const [posterImageFile, setPosterImageFile] = useState(null);
  const [posterImagePreview, setPosterImagePreview] = useState('');
  const [posterChanged, setPosterChanged] = useState(false);
  const [removePoster, setRemovePoster] = useState(false);
  const [selectedSample, setSelectedSample] = useState(0);
  const imageRef = useRef(null);
  const [imageNaturalSize, setImageNaturalSize] = useState({ width: 1, height: 1 });
  const dragState = useRef({
    active: false, type: null, startX: 0, startY: 0,
    startElX: 0, startElY: 0, startW: 0, startH: 0, isResize: false,
  });

  // Navigation
  const goToNext = () => {
    if (currentStep < SECTIONS.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToPrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const goToStep = (index) => {
    setCurrentStep(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Populate form data from event
  useEffect(() => {
    if (event) {
      const eventDate = event.date ? new Date(event.date) : new Date();
      const dateStr = eventDate.toISOString().split('T')[0];
      let timeStr = event.time || "";
      if (!timeStr && event.date) timeStr = eventDate.toTimeString().slice(0, 5);

      setFormData({
        title: event.title || "",
        category: event.category || "",
        eventType: event.eventType || "",
        date: dateStr,
        time: timeStr,
        duration: event.duration || "",
        location: event.location || "",
        venue: event.venue || "",
        isVirtual: event.isVirtual || false,
        meetingLink: event.meetingLink || "",
        isPaid: event.isPaid || false,
        price: event.price || "",
        maxAttendees: event.maxAttendees || "",
        registrationDeadline: event.registrationDeadline ? new Date(event.registrationDeadline).toISOString().split('T')[0] : "",
        featured: event.featured || false,
        tags: event.tags ? (Array.isArray(event.tags) ? event.tags.join(', ') : event.tags) : "",
        maxTicketsPerOrder: event.maxTicketsPerOrder || 10,
      });

      setDescription(event.description || "");

      if (event.ticketTypes && event.ticketTypes.length > 0) {
        setHasTicketTypes(true);
        setTicketTypes(event.ticketTypes);
      }
      if (event.enableMultipleTickets) setEnableMultipleTickets(true);

      if (event.images && event.images.length > 0) {
        setExistingImages(event.images);
        setImagesToKeep(event.images);
      }

      if (event.speakers && event.speakers.length > 0) {
        setSpeakers(event.speakers.map(s => ({ ...s, imagePreview: s.image || '' })));
      }

      // Load poster template
      if (event.posterTemplate && event.posterTemplate.image) {
        setPosterTemplate({
          image: event.posterTemplate.image,
          photoPlaceholder: event.posterTemplate.photoPlaceholder || { x: 100, y: 150, width: 200, height: 200, borderRadius: 0 },
          namePlaceholder: event.posterTemplate.namePlaceholder || { x: 100, y: 400, fontSize: 48, color: '#FFFFFF', fontFamily: 'Arial' },
        });
        setPosterImagePreview(event.posterTemplate.image);
        setRemovePoster(false);
        const img = new Image();
        img.onload = () => setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
        img.src = event.posterTemplate.image;
      } else {
        setPosterTemplate({
          image: '',
          photoPlaceholder: { x: 100, y: 150, width: 200, height: 200, borderRadius: 0 },
          namePlaceholder: { x: 100, y: 400, fontSize: 48, color: '#FFFFFF', fontFamily: 'Arial' },
        });
        setPosterImagePreview('');
        setRemovePoster(true);
        setImageNaturalSize({ width: 1, height: 1 });
      }
    }
  }, [event]);

  // Load custom form data
  useEffect(() => {
    if (customFormData && customFormData._id) {
      setFormTitle(customFormData.title || "");
      setFormDescription(customFormData.description || "");
      setFormFields(customFormData.fields || []);
    } else {
      setFormTitle("");
      setFormDescription("");
      setFormFields([]);
    }
  }, [customFormData]);

  // Track form changes
  useEffect(() => {
    if (!customFormData) return;
    const originalFields = customFormData.fields ? JSON.stringify(customFormData.fields) : '[]';
    const currentFields = JSON.stringify(formFields);
    setFormChanged(
      formTitle !== (customFormData.title || "") ||
      formDescription !== (customFormData.description || "") ||
      originalFields !== currentFields
    );
  }, [formTitle, formDescription, formFields, customFormData]);

  // Set editor content - FIXED for both desktop and mobile
  useEffect(() => {
    if (event?.description && !isLoadingEvent) {
      setDescription(event.description);
      // Check if editor ref exists and set its content
      if (editorRef.current) {
        editorRef.current.innerHTML = event.description;
        if (editorRef.current.innerHTML === '' || event.description === '') {
          setShowReloadInstruction(true);
        } else {
          setShowReloadInstruction(false);
        }
      }
    }
  }, [event, isLoadingEvent]);

  // ================== RICH TEXT ==================
  const ensureEditorReady = () => {
    const editor = editorRef.current;
    if (!editor) return false;
    editor.focus();
    const selection = window.getSelection();
    let range = selection.rangeCount > 0 ? selection.getRangeAt(0) : null;
    if (!range || !editor.contains(range.commonAncestorContainer)) {
      if (!editor.innerHTML || editor.innerHTML === '<br>' || editor.innerHTML === '') {
        editor.innerHTML = '<p><br></p>';
      }
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection.removeAllRanges();
      selection.addRange(range);
    }
    return true;
  };

  const execCommand = (command, value = null) => {
    ensureEditorReady();
    document.execCommand(command, false, value);
    editorRef.current?.focus();
    updateActiveStates();
  };

  const updateActiveStates = () => {
    if (!editorRef.current) return;
    setActiveStates({
      bold: document.queryCommandState('bold'),
      italic: document.queryCommandState('italic'),
      underline: document.queryCommandState('underline'),
      justifyLeft: document.queryCommandState('justifyLeft'),
      justifyCenter: document.queryCommandState('justifyCenter'),
      justifyRight: document.queryCommandState('justifyRight'),
    });
  };

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const handleSelectionChange = () => updateActiveStates();
    document.addEventListener('selectionchange', handleSelectionChange);
    editor.addEventListener('input', updateActiveStates);
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      if (editor) editor.removeEventListener('input', updateActiveStates);
    };
  }, []);

  const insertHeading = (level) => {
    ensureEditorReady();
    const selection = window.getSelection();
    if (selection.toString()) {
      const range = selection.getRangeAt(0);
      const heading = document.createElement(`h${level}`);
      heading.style.marginBottom = "8px";
      heading.style.fontWeight = "bold";
      heading.style.lineHeight = "1.4";
      if (level === 1) heading.style.fontSize = "24px";
      if (level === 2) heading.style.fontSize = "20px";
      if (level === 3) heading.style.fontSize = "16px";
      heading.textContent = selection.toString();
      range.deleteContents();
      range.insertNode(heading);
    }
    editorRef.current?.focus();
    updateActiveStates();
  };

  // ================== TOOLBAR ==================
  const renderToolbar = () => {
    const onToolbarMouseDown = (e) => e.preventDefault();

    const buttonClass = (isActive) =>
      `p-1.5 rounded transition-colors text-sm ${
        isActive
          ? 'bg-blue-100 text-blue-700 border border-blue-300'
          : 'text-gray-600 hover:bg-gray-200'
      }`;

    return (
      <div className="flex flex-wrap items-center gap-0.5 p-2 bg-gray-50 rounded-t-xl border border-gray-200 border-b-0">
        <button
          type="button"
          onMouseDown={onToolbarMouseDown}
          onClick={() => execCommand('bold')}
          className={buttonClass(activeStates.bold)}
          title="Bold"
        >
          <FaBold />
        </button>
        <button
          type="button"
          onMouseDown={onToolbarMouseDown}
          onClick={() => execCommand('italic')}
          className={buttonClass(activeStates.italic)}
          title="Italic"
        >
          <FaItalic />
        </button>
        <button
          type="button"
          onMouseDown={onToolbarMouseDown}
          onClick={() => execCommand('underline')}
          className={buttonClass(activeStates.underline)}
          title="Underline"
        >
          <FaUnderline />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-0.5" />
        <button
          type="button"
          onMouseDown={onToolbarMouseDown}
          onClick={() => execCommand('justifyLeft')}
          className={buttonClass(activeStates.justifyLeft)}
          title="Left align"
        >
          <FaAlignLeft />
        </button>
        <button
          type="button"
          onMouseDown={onToolbarMouseDown}
          onClick={() => execCommand('justifyCenter')}
          className={buttonClass(activeStates.justifyCenter)}
          title="Center align"
        >
          <FaAlignCenter />
        </button>
        <button
          type="button"
          onMouseDown={onToolbarMouseDown}
          onClick={() => execCommand('justifyRight')}
          className={buttonClass(activeStates.justifyRight)}
          title="Right align"
        >
          <FaAlignRight />
        </button>
        <div className="w-px h-6 bg-gray-300 mx-0.5" />
        <button
          type="button"
          onMouseDown={onToolbarMouseDown}
          onClick={() => insertHeading(2)}
          className="p-1.5 hover:bg-gray-200 rounded transition-colors text-gray-600"
          title="Heading"
        >
          <FaHeading />
        </button>
      </div>
    );
  };

  // ================== POSTER DRAG & DROP ==================
  const getImageCoords = (clientX, clientY) => {
    const imgRect = imageRef.current?.getBoundingClientRect();
    if (!imgRect) return null;
    const scaleX = imageNaturalSize.width / imgRect.width;
    const scaleY = imageNaturalSize.height / imgRect.height;
    return { x: (clientX - imgRect.left) * scaleX, y: (clientY - imgRect.top) * scaleY };
  };

  const startDrag = (e, type, isResize = false) => {
    e.preventDefault();
    e.stopPropagation();
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    if (clientX == null) return;
    const coords = getImageCoords(clientX, clientY);
    if (!coords) return;
    dragState.current = {
      active: true, type, isResize,
      startX: clientX, startY: clientY,
      startElX: type === 'photo' ? posterTemplate.photoPlaceholder.x : posterTemplate.namePlaceholder.x,
      startElY: type === 'photo' ? posterTemplate.photoPlaceholder.y : posterTemplate.namePlaceholder.y,
      startW: posterTemplate.photoPlaceholder.width,
      startH: posterTemplate.photoPlaceholder.height,
    };
    document.addEventListener('mousemove', onDragMove);
    document.addEventListener('mouseup', onDragEnd);
    document.addEventListener('touchmove', onDragMove, { passive: false });
    document.addEventListener('touchend', onDragEnd);
  };

  const onDragMove = (e) => {
    if (!dragState.current.active) return;
    const clientX = e.clientX || e.touches?.[0]?.clientX;
    const clientY = e.clientY || e.touches?.[0]?.clientY;
    if (clientX == null) return;
    const coords = getImageCoords(clientX, clientY);
    if (!coords) return;
    const { type, isResize, startX, startY, startElX, startElY, startW, startH } = dragState.current;
    const imgRect = imageRef.current?.getBoundingClientRect();
    if (!imgRect) return;
    const scaleX = imageNaturalSize.width / imgRect.width;
    const scaleY = imageNaturalSize.height / imgRect.height;
    const pixelDx = (clientX - startX) * scaleX;
    const pixelDy = (clientY - startY) * scaleY;

    if (isResize) {
      let newW = Math.max(30, startW + pixelDx);
      let newH = Math.max(30, startH + pixelDy);
      newW = Math.min(newW, imageNaturalSize.width - posterTemplate.photoPlaceholder.x);
      newH = Math.min(newH, imageNaturalSize.height - posterTemplate.photoPlaceholder.y);
      setPosterTemplate(prev => ({
        ...prev,
        photoPlaceholder: { ...prev.photoPlaceholder, width: newW, height: newH },
      }));
      setPosterChanged(true);
    } else {
      let newX = startElX + pixelDx;
      let newY = startElY + pixelDy;
      if (type === 'photo') {
        newX = Math.max(0, Math.min(newX, imageNaturalSize.width - posterTemplate.photoPlaceholder.width));
        newY = Math.max(0, Math.min(newY, imageNaturalSize.height - posterTemplate.photoPlaceholder.height));
        setPosterTemplate(prev => ({
          ...prev,
          photoPlaceholder: { ...prev.photoPlaceholder, x: newX, y: newY },
        }));
      } else {
        newX = Math.max(0, Math.min(newX, imageNaturalSize.width));
        newY = Math.max(0, Math.min(newY, imageNaturalSize.height));
        setPosterTemplate(prev => ({
          ...prev,
          namePlaceholder: { ...prev.namePlaceholder, x: newX, y: newY },
        }));
      }
      setPosterChanged(true);
    }
  };

  const onDragEnd = () => {
    dragState.current.active = false;
    document.removeEventListener('mousemove', onDragMove);
    document.removeEventListener('mouseup', onDragEnd);
    document.removeEventListener('touchmove', onDragMove);
    document.removeEventListener('touchend', onDragEnd);
  };

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', onDragMove);
      document.removeEventListener('mouseup', onDragEnd);
      document.removeEventListener('touchmove', onDragMove);
      document.removeEventListener('touchend', onDragEnd);
    };
  }, []);

  // ================== HANDLERS ==================
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    const total = existingImages.length + newImages.length + files.length;
    if (total > 10) { toast.error(`Max 10. Currently: ${existingImages.length + newImages.length}`); return; }
    const vf = []; const pv = [];
    for (const f of files) {
      if (!f.type.startsWith("image/")) { toast.error(`${f.name} not an image`); continue; }
      if (f.size > 10 * 1024 * 1024) { toast.error(`${f.name} > 10MB`); continue; }
      vf.push(f);
      const r = new FileReader();
      r.onloadend = () => { pv.push(r.result); if (pv.length === vf.length) setNewImagePreviews(prev => [...prev, ...pv]); };
      r.readAsDataURL(f);
    }
    setNewImages(prev => [...prev, ...vf]);
  };

  const removeExistingImage = (i) => {
    const updated = existingImages.filter((_, j) => j !== i);
    setExistingImages(updated);
    setImagesToKeep(updated);
  };
  const removeNewImage = (i) => {
    setNewImages(prev => prev.filter((_, j) => j !== i));
    setNewImagePreviews(prev => prev.filter((_, j) => j !== i));
  };

  // Ticket types
  const addTicketType = () => setTicketTypes([...ticketTypes, { name: '', price: '', capacity: '', seatsPerTicket: 1, description: '' }]);
  const removeTicketType = (index) => setTicketTypes(ticketTypes.filter((_, i) => i !== index));
  const updateTicketType = (index, field, value) => {
    const updated = [...ticketTypes];
    updated[index] = { ...updated[index], [field]: value };
    setTicketTypes(updated);
  };

  // Speakers
  const addSpeaker = () => setSpeakers([...speakers, { name: '', title: '', company: '', bio: '', image: '', imagePreview: '' }]);
  const removeSpeaker = (index) => {
    setSpeakerFiles(prev => {
      const updated = { ...prev };
      delete updated[index];
      const reindexed = {};
      Object.keys(updated).sort((a, b) => Number(a) - Number(b)).forEach((key, i) => { reindexed[i] = updated[key]; });
      return reindexed;
    });
    setSpeakers(speakers.filter((_, i) => i !== index));
  };
  const updateSpeaker = (index, field, value) => {
    const updated = [...speakers];
    updated[index] = { ...updated[index], [field]: value };
    setSpeakers(updated);
  };
  const handleSpeakerImageSelect = (index, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Invalid image"); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setSpeakerFiles(prev => ({ ...prev, [index]: file }));
    const reader = new FileReader();
    reader.onloadend = () => updateSpeaker(index, 'imagePreview', reader.result);
    reader.readAsDataURL(file);
  };
  const removeSpeakerImage = (index) => {
    setSpeakerFiles(prev => { const u = { ...prev }; delete u[index]; return u; });
    updateSpeaker(index, 'imagePreview', '');
    updateSpeaker(index, 'image', '');
  };

  // Form fields
  const addFormField = () => {
    setFormFields([...formFields, {
      label: '', type: 'text', required: false, options: [], placeholder: '', order: formFields.length,
    }]);
  };
  const removeFormField = (index) => setFormFields(formFields.filter((_, i) => i !== index));
  const updateFormField = (index, key, value) => {
    const updated = [...formFields];
    updated[index] = { ...updated[index], [key]: value };
    if (key === 'type' && !['dropdown', 'checkbox', 'radio'].includes(value)) {
      updated[index].options = [];
    }
    setFormFields(updated);
  };
  const addOption = (fieldIndex) => {
    const updated = [...formFields];
    updated[fieldIndex].options = [...(updated[fieldIndex].options || []), ''];
    setFormFields(updated);
  };
  const updateOption = (fieldIndex, optionIndex, value) => {
    const updated = [...formFields];
    updated[fieldIndex].options[optionIndex] = value;
    setFormFields(updated);
  };
  const removeOption = (fieldIndex, optionIndex) => {
    const updated = [...formFields];
    updated[fieldIndex].options.splice(optionIndex, 1);
    setFormFields(updated);
  };
  const moveFieldUp = (index) => {
    if (index === 0) return;
    const updated = [...formFields];
    [updated[index], updated[index - 1]] = [updated[index - 1], updated[index]];
    setFormFields(updated);
  };
  const moveFieldDown = (index) => {
    if (index === formFields.length - 1) return;
    const updated = [...formFields];
    [updated[index], updated[index + 1]] = [updated[index + 1], updated[index]];
    setFormFields(updated);
  };

  // Poster handlers
  const handlePosterImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Please select an image"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Max 10MB"); return; }
    setPosterImageFile(file);
    setRemovePoster(false);
    setPosterChanged(true);
    const reader = new FileReader();
    reader.onloadend = () => {
      setPosterImagePreview(reader.result);
      const img = new Image();
      img.onload = () => setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const applySampleBackground = (index) => {
    setSelectedSample(index);
    setPosterImagePreview(SAMPLE_BACKGROUNDS[index].url);
    setPosterImageFile(null);
    setRemovePoster(false);
    setPosterChanged(true);
    const img = new Image();
    img.onload = () => setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    img.src = SAMPLE_BACKGROUNDS[index].url;
  };

  const removePosterImage = () => {
    setPosterImageFile(null);
    setPosterImagePreview('');
    setPosterTemplate(prev => ({ ...prev, image: '' }));
    setRemovePoster(true);
    setPosterChanged(true);
    setImageNaturalSize({ width: 1, height: 1 });
  };

  const updatePosterNamePlaceholder = (field, value) => {
    setPosterTemplate(prev => ({
      ...prev,
      namePlaceholder: { ...prev.namePlaceholder, [field]: field === 'color' ? value : (Number(value) || value) },
    }));
    setPosterChanged(true);
  };

  const updatePhotoBorderRadius = (value) => {
    setPosterTemplate(prev => ({
      ...prev,
      photoPlaceholder: { ...prev.photoPlaceholder, borderRadius: Number(value) },
    }));
    setPosterChanged(true);
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title.trim()) { toast.error("Title required"); return; }
    if (!description || description === "<br>" || description.trim().length < 20) { toast.error("Description required"); return; }
    if (!formData.category) { toast.error("Category required"); return; }
    if (!formData.eventType) { toast.error("Event type required"); return; }
    if (!formData.date) { toast.error("Date required"); return; }
    if (!formData.time) { toast.error("Time required"); return; }
    if (!formData.location && !formData.venue) { toast.error("Location required"); return; }
    if (existingImages.length === 0 && newImages.length === 0) { toast.error("At least one image required"); return; }

    if (formData.isPaid && hasTicketTypes && ticketTypes.length > 0) {
      for (const tt of ticketTypes) {
        if (!tt.name?.trim()) { toast.error("Ticket types need a name"); return; }
        if (!tt.price || Number(tt.price) <= 0) { toast.error(`Price required for "${tt.name}"`); return; }
      }
    }

    const fd = new FormData();
    fd.append("title", formData.title.trim());
    fd.append("description", description);
    fd.append("category", formData.category);
    fd.append("eventType", formData.eventType);
    fd.append("date", formData.date);
    fd.append("time", formData.time);
    fd.append("duration", formData.duration || "");
    fd.append("location", formData.location || "");
    fd.append("venue", formData.venue || formData.location || "");
    fd.append("isVirtual", formData.isVirtual);
    fd.append("meetingLink", formData.meetingLink || "");
    fd.append("isPaid", formData.isPaid);
    fd.append("price", formData.isPaid && !hasTicketTypes ? formData.price : "0");
    fd.append("maxAttendees", formData.maxAttendees || "0");
    fd.append("featured", formData.featured);
    fd.append("tags", formData.tags || "");
    fd.append("enableMultipleTickets", enableMultipleTickets);
    fd.append("maxTicketsPerOrder", formData.maxTicketsPerOrder || 10);
    if (formData.registrationDeadline) fd.append("registrationDeadline", formData.registrationDeadline);
    if (imagesToKeep.length > 0) fd.append("keepImages", JSON.stringify(imagesToKeep));
    if (hasTicketTypes && ticketTypes.length > 0) fd.append("ticketTypes", JSON.stringify(ticketTypes));
    newImages.forEach(img => fd.append("images", img));

    const speakersForSubmit = speakers.map(({ imagePreview, ...rest }) => ({ ...rest, image: rest.image || '' }));
    if (speakersForSubmit.length > 0) fd.append("speakers", JSON.stringify(speakersForSubmit));
    Object.entries(speakerFiles).forEach(([index, file]) => fd.append(`speakerImages[${index}]`, file));

    if (removePoster) {
      fd.append("posterTemplate", JSON.stringify({ image: '', photoPlaceholder: {}, namePlaceholder: {} }));
    } else if (posterChanged) {
      if (posterImageFile) fd.append("posterImage", posterImageFile);
      fd.append("posterTemplate", JSON.stringify({
        image: posterImageFile ? '' : posterTemplate.image,
        photoPlaceholder: posterTemplate.photoPlaceholder,
        namePlaceholder: posterTemplate.namePlaceholder,
      }));
    }

    try {
      await updateEvent({ id, formData: fd }).unwrap();
      toast.success("Event updated!");

      if (formChanged) {
        const formPayload = {
          title: formTitle,
          description: formDescription,
          fields: formFields.map(({ _id, ...rest }) => rest),
        };
        await updateCustomForm({ id, data: formPayload }).unwrap();
        toast.success("Registration form updated!");
      }

      navigate(`/dashboard/events/${id}`);
    } catch (err) {
      toast.error(err?.data?.message || "Update failed");
    }
  };

  if (isLoadingEvent || isLoadingForm) {
    return (
      <EventDashboardSidebar>
        <div className="flex justify-center items-center h-96">
          <FaSpinner className="w-12 h-12 text-blue-600 animate-spin" />
        </div>
      </EventDashboardSidebar>
    );
  }

  if (!event) {
    return (
      <EventDashboardSidebar>
        <div className="text-center py-20">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Event Not Found</h2>
          <button onClick={() => navigate('/dashboard/events')} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Back to Events</button>
        </div>
      </EventDashboardSidebar>
    );
  }

  // ===== DESKTOP LAYOUT =====
  const renderDesktopLayout = () => (
    <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
      <div className="lg:col-span-2 space-y-4 sm:space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FaInfoCircle className="text-blue-600 text-lg" />
            <h2 className="text-sm font-semibold text-gray-900">Basic Information</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Event Title <span className="text-red-500">*</span></label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="e.g., Tech Conference 2026" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Category <span className="text-red-500">*</span></label>
                <select name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm">
                  <option value="">Select category</option>
                  {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Event Type <span className="text-red-500">*</span></label>
                <select name="eventType" value={formData.eventType} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm">
                  <option value="">Select type</option>
                  {eventTypes.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Tags</label>
              <input type="text" name="tags" value={formData.tags} onChange={handleChange} placeholder="e.g., tech, startup, conference" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" />
            </div>
          </div>
        </div>

        {/* Date & Location */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FaCalendarAlt className="text-blue-600 text-lg" />
            <h2 className="text-sm font-semibold text-gray-900">Date & Location</h2>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Date <span className="text-red-500">*</span></label>
                <input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Time <span className="text-red-500">*</span></label>
                <input type="time" name="time" value={formData.time} onChange={handleChange} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Duration</label>
                <input type="text" name="duration" value={formData.duration} onChange={handleChange} placeholder="e.g., 2 hours" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Venue</label>
                <input type="text" name="venue" value={formData.venue} onChange={handleChange} placeholder="e.g., Eko Convention Centre" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">City / Address</label>
                <input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="e.g., Victoria Island, Lagos" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" name="isVirtual" checked={formData.isVirtual} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <label className="text-sm text-gray-700 flex items-center gap-1.5"><FaVideo className="text-blue-500" /> Virtual / Online Event</label>
            </div>
            {formData.isVirtual && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Meeting Link</label>
                <input type="url" name="meetingLink" value={formData.meetingLink} onChange={handleChange} placeholder="https://meet.google.com/xxx" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" />
              </div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2">
              <FaFileImage className="text-blue-600 text-lg" />
              <h2 className="text-sm font-semibold text-gray-900">Description <span className="text-red-500">*</span></h2>
            </div>
            <button type="button" onClick={() => setPreviewMode(!previewMode)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${previewMode ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              <FaEye className="text-xs" /> {previewMode ? "Editing" : "Preview"}
            </button>
          </div>
          {!previewMode && renderToolbar()}
          {previewMode ? (
            <div className="min-h-[120px] p-4 border border-gray-200 rounded-b-xl bg-white prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: description }} />
          ) : (
            <div
              ref={editorRef}
              contentEditable
              suppressContentEditableWarning
              className="min-h-[120px] p-4 border border-gray-200 rounded-b-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 leading-relaxed text-sm bg-white"
              onInput={(e) => setDescription(e.currentTarget.innerHTML)}
              onFocus={ensureEditorReady}
              onClick={ensureEditorReady}
            />
          )}
          {showReloadInstruction && (
            <div className="mt-3 flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <FaExclamationCircle className="text-yellow-500" />
              <span>Description didn't load? <button type="button" onClick={() => window.location.reload()} className="underline text-blue-600 font-medium inline-flex items-center gap-1"><FaSyncAlt className="text-xs" /> Reload the page</button></span>
            </div>
          )}
        </div>

        {/* Images */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FaImage className="text-blue-600 text-lg" />
            <h2 className="text-sm font-semibold text-gray-900">Event Images <span className="text-red-500">*</span> <span className="text-xs text-gray-400 font-normal">({existingImages.length + newImages.length}/10)</span></h2>
          </div>
          {(existingImages.length + newImages.length) < 10 && (
            <label className="block w-full cursor-pointer mb-4">
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors bg-gray-50">
                <FaPlus className="text-2xl text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600 font-medium">Click to upload images</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP (Max 10MB each)</p>
                <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
              </div>
            </label>
          )}
          {(existingImages.length > 0 || newImagePreviews.length > 0) && (
            <div className="grid grid-cols-3 gap-3">
              {existingImages.map((img, idx) => (
                <div key={`e-${idx}`} className="relative group aspect-square">
                  <img src={img} alt="" className="w-full h-full object-cover rounded-xl border border-gray-200" />
                  <button type="button" onClick={() => removeExistingImage(idx)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <FaTimes className="text-xs" />
                  </button>
                  {idx === 0 && <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded">Cover</span>}
                </div>
              ))}
              {newImagePreviews.map((p, idx) => (
                <div key={`n-${idx}`} className="relative group aspect-square">
                  <img src={p} alt="" className="w-full h-full object-cover rounded-xl border border-gray-200" />
                  <button type="button" onClick={() => removeNewImage(idx)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <FaTimes className="text-xs" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Tickets */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FaTicketAlt className="text-blue-600 text-lg" />
            <h2 className="text-sm font-semibold text-gray-900">Tickets & Pricing</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input type="checkbox" name="isPaid" checked={formData.isPaid} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" />
              <label className="text-sm text-gray-700 font-medium">This is a paid event</label>
            </div>
            {formData.isPaid && (
              <div className="flex items-center gap-2">
                <input type="checkbox" checked={hasTicketTypes} onChange={(e) => setHasTicketTypes(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                <label className="text-sm text-gray-700">Multiple ticket types</label>
              </div>
            )}
            {formData.isPaid && !hasTicketTypes && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1.5">Ticket Price (₦) <span className="text-red-500">*</span></label>
                <input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="e.g., 5000" min="100" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" />
              </div>
            )}
            {hasTicketTypes && (
              <div className="space-y-3">
                {ticketTypes.map((tt, index) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">Ticket #{index + 1}</span>
                      <button type="button" onClick={() => removeTicketType(index)} className="text-red-500 hover:bg-red-50 p-1 rounded"><FaTimes className="text-sm" /></button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div><label className="text-xs text-gray-500">Name *</label><input type="text" value={tt.name} onChange={(e) => updateTicketType(index, 'name', e.target.value)} placeholder="e.g., VIP" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" /></div>
                      <div><label className="text-xs text-gray-500">Price (₦) *</label><input type="number" value={tt.price} onChange={(e) => updateTicketType(index, 'price', e.target.value)} placeholder="5000" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" /></div>
                      <div><label className="text-xs text-gray-500">Capacity</label><input type="number" value={tt.capacity} onChange={(e) => updateTicketType(index, 'capacity', e.target.value)} placeholder="0=unlimited" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" /></div>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={addTicketType} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 text-sm hover:border-blue-500 hover:text-blue-500 transition-colors">
                  <FaPlus className="inline mr-1.5 text-xs" /> Add Ticket Type
                </button>
              </div>
            )}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-3">
                <input type="checkbox" checked={enableMultipleTickets} onChange={(e) => setEnableMultipleTickets(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                <label className="text-sm text-gray-700">Allow multiple tickets per order</label>
              </div>
              {enableMultipleTickets && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1.5">Max Tickets Per Order</label>
                  <input type="number" name="maxTicketsPerOrder" value={formData.maxTicketsPerOrder} onChange={handleChange} min="1" max="100" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" />
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Max Attendees</label>
              <input type="number" name="maxAttendees" value={formData.maxAttendees} onChange={handleChange} placeholder="Leave empty for unlimited" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" />
              <p className="text-xs text-gray-400 mt-1">0 means unlimited</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Registration Deadline</label>
              <input type="date" name="registrationDeadline" value={formData.registrationDeadline} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" />
            </div>
          </div>
        </div>

        {/* Speakers */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <FaUser className="text-blue-600 text-lg" />
              <h2 className="text-sm font-semibold text-gray-900">Speakers & Hosts</h2>
            </div>
            <button type="button" onClick={addSpeaker} className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <FaPlus className="text-xs" /> Add
            </button>
          </div>
          {speakers.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No speakers added yet</p>
          ) : (
            <div className="space-y-4">
              {speakers.map((speaker, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Speaker {idx + 1}</span>
                    <button type="button" onClick={() => removeSpeaker(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded"><FaTrashAlt className="text-sm" /></button>
                  </div>
                  <div className="flex items-center gap-4 mb-3">
                    {speaker.imagePreview ? (
                      <div className="relative group">
                        <img src={speaker.imagePreview} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-blue-200" />
                        <button type="button" onClick={() => removeSpeakerImage(idx)} className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"><FaTimes className="text-[10px]" /></button>
                      </div>
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center border-2 border-dashed border-gray-300"><FaUser className="text-2xl text-gray-400" /></div>
                    )}
                    <label className="cursor-pointer">
                      <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                        <FaCamera className="text-xs" /> {speaker.imagePreview ? 'Change' : 'Upload'}
                      </span>
                      <input type="file" accept="image/*" onChange={(e) => handleSpeakerImageSelect(idx, e)} className="hidden" />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div><label className="text-xs text-gray-500">Name</label><input type="text" value={speaker.name} onChange={(e) => updateSpeaker(idx, 'name', e.target.value)} placeholder="Full name" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" /></div>
                    <div><label className="text-xs text-gray-500">Title/Role</label><input type="text" value={speaker.title} onChange={(e) => updateSpeaker(idx, 'title', e.target.value)} placeholder="e.g., CEO" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" /></div>
                    <div className="sm:col-span-2"><label className="text-xs text-gray-500">Company</label><input type="text" value={speaker.company} onChange={(e) => updateSpeaker(idx, 'company', e.target.value)} placeholder="Company name" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" /></div>
                    <div className="sm:col-span-2"><label className="text-xs text-gray-500">Bio</label><textarea value={speaker.bio} onChange={(e) => updateSpeaker(idx, 'bio', e.target.value)} placeholder="Brief bio..." rows={2} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" /></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Custom Form */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FaClipboardList className="text-blue-600 text-lg" />
            <h2 className="text-sm font-semibold text-gray-900">Custom Registration Form</h2>
          </div>
          <div className="bg-blue-50 border-l-4 border-blue-500 rounded-md p-3 mb-4 flex items-start gap-2 text-sm">
            <FaInfoCircle className="text-blue-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-800 text-sm">Default fields: Name, Email, Phone</p>
              <p className="text-blue-700 text-xs">Add extra questions for attendees</p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Form Title</label>
              <input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g., Additional Info" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" />
            </div>
            {formFields.map((field, idx) => (
              <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">Field {idx + 1}</span>
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => moveFieldUp(idx)} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><FaChevronUp className="text-xs" /></button>
                    <button type="button" onClick={() => moveFieldDown(idx)} disabled={idx === formFields.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"><FaChevronDown className="text-xs" /></button>
                    <button type="button" onClick={() => removeFormField(idx)} className="p-1 text-red-500 hover:bg-red-50 rounded"><FaTrashAlt className="text-xs" /></button>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2"><label className="text-xs text-gray-500">Label *</label><input type="text" value={field.label} onChange={(e) => updateFormField(idx, 'label', e.target.value)} placeholder="Question" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" /></div>
                  <div><label className="text-xs text-gray-500">Type</label><select value={field.type} onChange={(e) => updateFormField(idx, 'type', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm">{FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}</select></div>
                  <div className="flex items-center"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={field.required || false} onChange={(e) => updateFormField(idx, 'required', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /><span className="text-sm text-gray-700">Required</span></label></div>
                  {['dropdown', 'checkbox', 'radio'].includes(field.type) && (
                    <div className="sm:col-span-2">
                      <label className="text-xs text-gray-500">Options</label>
                      {field.options?.map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-1 mb-1">
                          <input type="text" value={opt} onChange={(e) => updateOption(idx, optIdx, e.target.value)} placeholder={`Option ${optIdx + 1}`} className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" />
                          <button type="button" onClick={() => removeOption(idx, optIdx)} className="text-red-500 p-1"><FaTimes className="text-xs" /></button>
                        </div>
                      ))}
                      <button type="button" onClick={() => addOption(idx)} className="text-sm text-blue-600 hover:underline">+ Add option</button>
                    </div>
                  )}
                  {!['dropdown', 'checkbox', 'radio'].includes(field.type) && (
                    <div className="sm:col-span-2"><label className="text-xs text-gray-500">Placeholder</label><input type="text" value={field.placeholder || ''} onChange={(e) => updateFormField(idx, 'placeholder', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" /></div>
                  )}
                </div>
              </div>
            ))}
            <button type="button" onClick={addFormField} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 text-sm hover:border-blue-500 hover:text-blue-500 transition-colors">
              <FaPlus className="inline mr-1.5 text-xs" /> Add Field
            </button>
          </div>
        </div>

        {/* Poster */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <FaPaintBrush className="text-blue-600 text-lg" />
            <div>
              <h2 className="text-sm font-semibold text-gray-900">"I'm Attending" Poster</h2>
              <p className="text-xs text-gray-500">Create a shareable poster for attendees</p>
            </div>
            <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">Optional</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
              {posterImagePreview && !removePoster ? (
                <div className="relative" style={{ userSelect: 'none' }}>
                  <img ref={imageRef} src={posterImagePreview} alt="Poster template" className="w-full h-auto" draggable={false} onLoad={(e) => { const img = e.target; setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight }); }} />
                  <div
                    className="absolute border-2 border-blue-500 bg-blue-500/20 cursor-move flex items-center justify-center text-blue-600 text-xs font-semibold"
                    style={{
                      left: `${(posterTemplate.photoPlaceholder.x / imageNaturalSize.width) * 100}%`,
                      top: `${(posterTemplate.photoPlaceholder.y / imageNaturalSize.height) * 100}%`,
                      width: `${(posterTemplate.photoPlaceholder.width / imageNaturalSize.width) * 100}%`,
                      height: `${(posterTemplate.photoPlaceholder.height / imageNaturalSize.height) * 100}%`,
                      borderRadius: `${posterTemplate.photoPlaceholder.borderRadius || 0}px`,
                    }}
                    onMouseDown={(e) => startDrag(e, 'photo', false)}
                    onTouchStart={(e) => startDrag(e, 'photo', false)}
                  >
                    <FaCamera className="mr-1 text-xs" /> Photo
                    <div
                      className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize rounded-bl-none rounded-tr-none"
                      onMouseDown={(e) => { e.stopPropagation(); startDrag(e, 'photo', true); }}
                      onTouchStart={(e) => { e.stopPropagation(); startDrag(e, 'photo', true); }}
                    >
                      <FaArrowsAlt className="text-white text-[10px] absolute bottom-0.5 right-0.5" />
                    </div>
                  </div>
                  <div
                    className="absolute cursor-move font-bold"
                    style={{
                      left: `${(posterTemplate.namePlaceholder.x / imageNaturalSize.width) * 100}%`,
                      top: `${(posterTemplate.namePlaceholder.y / imageNaturalSize.height) * 100}%`,
                      color: posterTemplate.namePlaceholder.color,
                      fontSize: `${(posterTemplate.namePlaceholder.fontSize / imageNaturalSize.height) * 100}vh`,
                      fontFamily: posterTemplate.namePlaceholder.fontFamily,
                      whiteSpace: 'nowrap',
                    }}
                    onMouseDown={(e) => startDrag(e, 'name', false)}
                    onTouchStart={(e) => startDrag(e, 'name', false)}
                  >
                    <FaPen className="mr-1 inline text-xs" /> Your Name
                    <div className="absolute top-0 left-0 w-full h-full border-2 border-green-500 bg-green-500/10 -z-10" />
                  </div>
                </div>
              ) : (
                <div className="aspect-video flex items-center justify-center text-gray-400 flex-col p-8">
                  <FaImage className="text-3xl mb-2" />
                  <p className="text-sm">Select a background</p>
                </div>
              )}
              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1">
                <FaArrowsAlt className="text-[10px]" /> Drag to position
              </div>
            </div>
            <div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">Background</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {SAMPLE_BACKGROUNDS.map((sample, idx) => (
                    <button key={idx} type="button" onClick={() => applySampleBackground(idx)} className={`w-12 h-12 rounded-lg border-2 overflow-hidden ${selectedSample === idx ? 'border-blue-500 shadow-md' : 'border-gray-200'}`}>
                      <img src={sample.url} alt={sample.label} className="w-full h-full object-cover" />
                    </button>
                  ))}
                  <label className="cursor-pointer">
                    <div className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-blue-500 transition-colors">
                      <FaPlus className="text-gray-400" />
                    </div>
                    <input type="file" accept="image/*" onChange={handlePosterImageSelect} className="hidden" />
                  </label>
                </div>
                <p className="text-xs text-gray-400">Choose a sample or upload your own</p>
              </div>
              <div className="space-y-3">
                <div><label className="block text-xs text-gray-500 mb-1">Name Font Size</label><input type="number" value={posterTemplate.namePlaceholder.fontSize} onChange={(e) => updatePosterNamePlaceholder('fontSize', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Name Color</label><input type="color" value={posterTemplate.namePlaceholder.color} onChange={(e) => updatePosterNamePlaceholder('color', e.target.value)} className="w-full h-10 p-1 border border-gray-200 rounded-lg" /></div>
                <div><label className="block text-xs text-gray-500 mb-1">Font Family</label><select value={posterTemplate.namePlaceholder.fontFamily} onChange={(e) => updatePosterNamePlaceholder('fontFamily', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                  <option value="Arial">Arial</option><option value="Helvetica">Helvetica</option><option value="Georgia">Georgia</option><option value="Times New Roman">Times New Roman</option><option value="Courier New">Courier New</option><option value="Verdana">Verdana</option>
                </select></div>
                <div><label className="block text-xs text-gray-500 mb-1">Photo Border Radius (px)</label><input type="number" value={posterTemplate.photoPlaceholder.borderRadius || 0} onChange={(e) => updatePhotoBorderRadius(e.target.value)} min="0" max="200" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="hidden lg:block space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Quick Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3"><FaInfoCircle className="text-blue-600 mt-0.5" /><div><p className="text-gray-500 text-xs">Title</p><p className="text-gray-900 font-medium truncate">{formData.title || 'Not set'}</p></div></div>
            <div className="flex items-start gap-3"><FaCalendarAlt className="text-blue-600 mt-0.5" /><div><p className="text-gray-500 text-xs">Date</p><p className="text-gray-900">{formData.date || 'Not set'}</p></div></div>
            <div className="flex items-start gap-3"><FaMapMarkerAlt className="text-blue-600 mt-0.5" /><div><p className="text-gray-500 text-xs">Location</p><p className="text-gray-900 truncate">{formData.location || formData.venue || 'Not set'}</p></div></div>
            <div className="flex items-start gap-3"><FaTicketAlt className="text-blue-600 mt-0.5" /><div><p className="text-gray-500 text-xs">Ticket</p><p className="text-gray-900">{formData.isPaid ? `₦${formData.price || '0'}` : 'Free'}</p></div></div>
            <div className="flex items-start gap-3"><FaImage className="text-blue-600 mt-0.5" /><div><p className="text-gray-500 text-xs">Images</p><p className="text-gray-900">{existingImages.length + newImages.length} uploaded</p></div></div>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button onClick={handleSubmit} disabled={isUpdating || isUpdatingForm} className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 text-sm">
              {(isUpdating || isUpdatingForm) ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // ===== MOBILE LAYOUT =====
  const renderMobileLayout = () => (
    <div className="sm:hidden">
      <div className="px-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-gray-500">Step {currentStep + 1} of {SECTIONS.length}</span>
          <span className="text-xs font-medium text-blue-600">{SECTIONS[currentStep].label}</span>
        </div>
        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600 rounded-full transition-all duration-300" style={{ width: `${((currentStep + 1) / SECTIONS.length) * 100}%` }} />
        </div>
      </div>

      <div className="bg-white rounded-none shadow-sm border border-gray-100 p-4 mx-0">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
          <div className="p-2 bg-blue-50 rounded-lg">{React.createElement(SECTIONS[currentStep].icon, { className: "text-blue-600 text-sm" })}</div>
          <div><h2 className="text-sm font-semibold text-gray-900">{SECTIONS[currentStep].label}</h2><p className="text-xs text-gray-400">{currentStep + 1} of {SECTIONS.length}</p></div>
        </div>
        {renderSection()}
      </div>

      <div className="flex items-center gap-3 mt-4 px-4">
        <button type="button" onClick={goToPrev} disabled={currentStep === 0} className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium text-sm transition-all ${currentStep === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
          <FaChevronLeft className="text-xs" /> Back
        </button>
        {currentStep === SECTIONS.length - 1 ? (
          <button type="button" onClick={handleSubmit} disabled={isUpdating || isUpdatingForm} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow-md disabled:opacity-50">
            <FaCheck className="text-xs" /> {isUpdating ? "Saving..." : "Save"}
          </button>
        ) : (
          <button type="button" onClick={goToNext} className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-all shadow-sm hover:shadow-md">
            Next <FaChevronRight className="text-xs" />
          </button>
        )}
      </div>

      <div className="flex items-center justify-center gap-1.5 mt-4 px-4">
        {SECTIONS.map((_, index) => (
          <button key={index} onClick={() => goToStep(index)} className={`w-2 h-2 rounded-full transition-all ${index === currentStep ? 'w-6 bg-blue-600' : index < currentStep ? 'bg-blue-300' : 'bg-gray-300'}`} />
        ))}
      </div>
    </div>
  );

  const renderSection = () => {
    const section = SECTIONS[currentStep];
    switch(section.id) {
      case 'basic':
        return (
          <div className="space-y-4">
            <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Event Title <span className="text-red-500">*</span></label><input type="text" name="title" value={formData.title} onChange={handleChange} placeholder="e.g., Tech Conference 2026" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Category <span className="text-red-500">*</span></label><select name="category" value={formData.category} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"><option value="">Select category</option>{categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Event Type <span className="text-red-500">*</span></label><select name="eventType" value={formData.eventType} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"><option value="">Select type</option>{eventTypes.map(type => <option key={type} value={type}>{type}</option>)}</select></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Tags</label><input type="text" name="tags" value={formData.tags} onChange={handleChange} placeholder="e.g., tech, startup" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" /></div>
          </div>
        );
      case 'details':
        return (
          <div className="space-y-4">
            <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Date <span className="text-red-500">*</span></label><input type="date" name="date" value={formData.date} onChange={handleChange} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Time <span className="text-red-500">*</span></label><input type="time" name="time" value={formData.time} onChange={handleChange} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Duration</label><input type="text" name="duration" value={formData.duration} onChange={handleChange} placeholder="e.g., 2 hours" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Venue</label><input type="text" name="venue" value={formData.venue} onChange={handleChange} placeholder="e.g., Eko Convention Centre" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1.5">City / Address</label><input type="text" name="location" value={formData.location} onChange={handleChange} placeholder="e.g., Victoria Island, Lagos" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" /></div>
            <div className="flex items-center gap-2"><input type="checkbox" name="isVirtual" checked={formData.isVirtual} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" /><label className="text-sm text-gray-700 flex items-center gap-1.5"><FaVideo className="text-blue-500" /> Virtual Event</label></div>
            {formData.isVirtual && (<div><label className="block text-xs font-medium text-gray-700 mb-1.5">Meeting Link</label><input type="url" name="meetingLink" value={formData.meetingLink} onChange={handleChange} placeholder="https://meet.google.com/xxx" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" /></div>)}
          </div>
        );
      case 'description':
        return (
          <div>
            <button type="button" onClick={() => setPreviewMode(!previewMode)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors mb-4 ${previewMode ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              <FaEye className="text-xs" /> {previewMode ? "Editing" : "Preview"}
            </button>
            {!previewMode && renderToolbar()}
            {previewMode ? (
              <div className="min-h-[120px] p-4 border border-gray-200 rounded-b-xl bg-white prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: description }} />
            ) : (
              <div 
                ref={editorRef} 
                contentEditable 
                suppressContentEditableWarning 
                className="min-h-[120px] p-4 border border-gray-200 rounded-b-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700 leading-relaxed text-sm bg-white" 
                onInput={(e) => setDescription(e.currentTarget.innerHTML)} 
                onFocus={ensureEditorReady} 
                onClick={ensureEditorReady} 
              />
            )}
            {showReloadInstruction && (
              <div className="mt-3 flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <FaExclamationCircle className="text-yellow-500" />
                <span>Description didn't load? <button type="button" onClick={() => window.location.reload()} className="underline text-blue-600 font-medium inline-flex items-center gap-1"><FaSyncAlt className="text-xs" /> Reload</button></span>
              </div>
            )}
          </div>
        );
      case 'media':
        return (
          <div>
            <div className="flex items-center gap-2 mb-4"><span className="text-xs text-gray-400">({existingImages.length + newImages.length}/10)</span></div>
            {(existingImages.length + newImages.length) < 10 && (
              <label className="block w-full cursor-pointer mb-4">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors bg-gray-50">
                  <FaPlus className="text-2xl text-gray-400 mx-auto mb-2" /><p className="text-sm text-gray-600 font-medium">Upload images</p><p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP</p>
                  <input type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
                </div>
              </label>
            )}
            {(existingImages.length > 0 || newImagePreviews.length > 0) && (
              <div className="grid grid-cols-3 gap-3">
                {existingImages.map((img, idx) => (
                  <div key={`e-${idx}`} className="relative group aspect-square">
                    <img src={img} alt="" className="w-full h-full object-cover rounded-xl border border-gray-200" />
                    <button type="button" onClick={() => removeExistingImage(idx)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"><FaTimes className="text-xs" /></button>
                    {idx === 0 && <span className="absolute bottom-1 left-1 bg-blue-600 text-white text-[10px] px-2 py-0.5 rounded">Cover</span>}
                  </div>
                ))}
                {newImagePreviews.map((p, idx) => (
                  <div key={`n-${idx}`} className="relative group aspect-square">
                    <img src={p} alt="" className="w-full h-full object-cover rounded-xl border border-gray-200" />
                    <button type="button" onClick={() => removeNewImage(idx)} className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100"><FaTimes className="text-xs" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'tickets':
        return (
          <div className="space-y-4">
            <div className="flex items-center gap-2"><input type="checkbox" name="isPaid" checked={formData.isPaid} onChange={handleChange} className="w-4 h-4 text-blue-600 rounded" /><label className="text-sm text-gray-700 font-medium">Paid event</label></div>
            {formData.isPaid && (<div className="flex items-center gap-2"><input type="checkbox" checked={hasTicketTypes} onChange={(e) => setHasTicketTypes(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /><label className="text-sm text-gray-700">Multiple ticket types</label></div>)}
            {formData.isPaid && !hasTicketTypes && (<div><label className="block text-xs font-medium text-gray-700 mb-1.5">Price (₦) <span className="text-red-500">*</span></label><input type="number" name="price" value={formData.price} onChange={handleChange} placeholder="5000" min="100" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" /></div>)}
            {hasTicketTypes && (
              <div className="space-y-3">
                {ticketTypes.map((tt, index) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3"><span className="text-sm font-medium text-gray-700">Ticket #{index + 1}</span><button type="button" onClick={() => removeTicketType(index)} className="text-red-500"><FaTimes className="text-sm" /></button></div>
                    <div className="space-y-2"><input type="text" value={tt.name} onChange={(e) => updateTicketType(index, 'name', e.target.value)} placeholder="Name *" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" /><input type="number" value={tt.price} onChange={(e) => updateTicketType(index, 'price', e.target.value)} placeholder="Price (₦) *" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" /><input type="number" value={tt.capacity} onChange={(e) => updateTicketType(index, 'capacity', e.target.value)} placeholder="Capacity" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" /></div>
                  </div>
                ))}
                <button type="button" onClick={addTicketType} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 text-sm hover:border-blue-500 hover:text-blue-500"><FaPlus className="inline mr-1.5 text-xs" /> Add Ticket</button>
              </div>
            )}
            <div className="pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 mb-3"><input type="checkbox" checked={enableMultipleTickets} onChange={(e) => setEnableMultipleTickets(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /><label className="text-sm text-gray-700">Multiple tickets per order</label></div>
              {enableMultipleTickets && (<div><label className="block text-xs font-medium text-gray-700 mb-1.5">Max per order</label><input type="number" name="maxTicketsPerOrder" value={formData.maxTicketsPerOrder} onChange={handleChange} min="1" max="100" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" /></div>)}
            </div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Max Attendees</label><input type="number" name="maxAttendees" value={formData.maxAttendees} onChange={handleChange} placeholder="Unlimited" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" /></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Registration Deadline</label><input type="date" name="registrationDeadline" value={formData.registrationDeadline} onChange={handleChange} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" /></div>
          </div>
        );
      case 'speakers':
        return (
          <div>
            <button type="button" onClick={addSpeaker} className="w-full mb-4 flex items-center justify-center gap-1.5 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"><FaPlus className="text-xs" /> Add Speaker</button>
            {speakers.length === 0 ? <p className="text-sm text-gray-400 text-center py-6">No speakers added yet</p> : (
              <div className="space-y-4">
                {speakers.map((speaker, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-3"><span className="text-sm font-medium text-gray-700">Speaker {idx + 1}</span><button type="button" onClick={() => removeSpeaker(idx)} className="text-red-500"><FaTrashAlt className="text-sm" /></button></div>
                    <div className="flex items-center gap-4 mb-3">
                      {speaker.imagePreview ? <img src={speaker.imagePreview} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-blue-200" /> : <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center"><FaUser className="text-2xl text-gray-400" /></div>}
                      <label className="cursor-pointer"><span className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm"><FaCamera className="text-xs" /> Upload</span><input type="file" accept="image/*" onChange={(e) => handleSpeakerImageSelect(idx, e)} className="hidden" /></label>
                    </div>
                    <div className="space-y-2"><input type="text" value={speaker.name} onChange={(e) => updateSpeaker(idx, 'name', e.target.value)} placeholder="Name" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" /><input type="text" value={speaker.title} onChange={(e) => updateSpeaker(idx, 'title', e.target.value)} placeholder="Title" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" /><input type="text" value={speaker.company} onChange={(e) => updateSpeaker(idx, 'company', e.target.value)} placeholder="Company" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" /><textarea value={speaker.bio} onChange={(e) => updateSpeaker(idx, 'bio', e.target.value)} placeholder="Bio" rows={2} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" /></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      case 'form':
        return (
          <div className="space-y-4">
            <div className="bg-blue-50 border-l-4 border-blue-500 rounded-md p-3 flex items-start gap-2 text-sm"><FaInfoCircle className="text-blue-500 mt-0.5 flex-shrink-0" /><div><p className="font-medium text-blue-800 text-sm">Default: Name, Email, Phone</p><p className="text-blue-700 text-xs">Add extra questions</p></div></div>
            <div><label className="block text-xs font-medium text-gray-700 mb-1.5">Form Title</label><input type="text" value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g., Additional Info" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm" /></div>
            {formFields.map((field, idx) => (
              <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3"><span className="text-sm font-medium text-gray-700">Field {idx + 1}</span><div className="flex items-center gap-1"><button type="button" onClick={() => moveFieldUp(idx)} disabled={idx === 0} className="p-1 text-gray-400"><FaChevronUp className="text-xs" /></button><button type="button" onClick={() => moveFieldDown(idx)} disabled={idx === formFields.length - 1} className="p-1 text-gray-400"><FaChevronDown className="text-xs" /></button><button type="button" onClick={() => removeFormField(idx)} className="p-1 text-red-500"><FaTrashAlt className="text-xs" /></button></div></div>
                <div className="space-y-2">
                  <input type="text" value={field.label} onChange={(e) => updateFormField(idx, 'label', e.target.value)} placeholder="Label *" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" />
                  <select value={field.type} onChange={(e) => updateFormField(idx, 'type', e.target.value)} className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm">{FIELD_TYPES.map(ft => <option key={ft.value} value={ft.value}>{ft.label}</option>)}</select>
                  <div className="flex items-center"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={field.required || false} onChange={(e) => updateFormField(idx, 'required', e.target.checked)} className="w-4 h-4 text-blue-600 rounded" /><span className="text-sm text-gray-700">Required</span></label></div>
                  {['dropdown', 'checkbox', 'radio'].includes(field.type) && (
                    <div><label className="text-xs text-gray-500">Options</label>{field.options?.map((opt, optIdx) => (<div key={optIdx} className="flex items-center gap-1 mb-1"><input type="text" value={opt} onChange={(e) => updateOption(idx, optIdx, e.target.value)} placeholder={`Option ${optIdx + 1}`} className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" /><button type="button" onClick={() => removeOption(idx, optIdx)} className="text-red-500"><FaTimes className="text-xs" /></button></div>))}<button type="button" onClick={() => addOption(idx)} className="text-sm text-blue-600 hover:underline">+ Add option</button></div>
                  )}
                  {!['dropdown', 'checkbox', 'radio'].includes(field.type) && (<input type="text" value={field.placeholder || ''} onChange={(e) => updateFormField(idx, 'placeholder', e.target.value)} placeholder="Placeholder" className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm" />)}
                </div>
              </div>
            ))}
            <button type="button" onClick={addFormField} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 text-sm hover:border-blue-500 hover:text-blue-500"><FaPlus className="inline mr-1.5 text-xs" /> Add Field</button>
          </div>
        );
      case 'poster':
        return (
          <div className="space-y-4">
            <div className="relative bg-gray-100 rounded-xl overflow-hidden border border-gray-200">
              {posterImagePreview && !removePoster ? (
                <div className="relative" style={{ userSelect: 'none' }}>
                  <img ref={imageRef} src={posterImagePreview} alt="Poster template" className="w-full h-auto" draggable={false} onLoad={(e) => { const img = e.target; setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight }); }} />
                  <div className="absolute border-2 border-blue-500 bg-blue-500/20 cursor-move flex items-center justify-center text-blue-600 text-xs font-semibold" style={{ left: `${(posterTemplate.photoPlaceholder.x / imageNaturalSize.width) * 100}%`, top: `${(posterTemplate.photoPlaceholder.y / imageNaturalSize.height) * 100}%`, width: `${(posterTemplate.photoPlaceholder.width / imageNaturalSize.width) * 100}%`, height: `${(posterTemplate.photoPlaceholder.height / imageNaturalSize.height) * 100}%`, borderRadius: `${posterTemplate.photoPlaceholder.borderRadius || 0}px` }} onMouseDown={(e) => startDrag(e, 'photo', false)} onTouchStart={(e) => startDrag(e, 'photo', false)}>
                    <FaCamera className="mr-1 text-xs" /> Photo
                    <div className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize rounded-bl-none rounded-tr-none" onMouseDown={(e) => { e.stopPropagation(); startDrag(e, 'photo', true); }} onTouchStart={(e) => { e.stopPropagation(); startDrag(e, 'photo', true); }}><FaArrowsAlt className="text-white text-[10px] absolute bottom-0.5 right-0.5" /></div>
                  </div>
                  <div className="absolute cursor-move font-bold" style={{ left: `${(posterTemplate.namePlaceholder.x / imageNaturalSize.width) * 100}%`, top: `${(posterTemplate.namePlaceholder.y / imageNaturalSize.height) * 100}%`, color: posterTemplate.namePlaceholder.color, fontSize: `${(posterTemplate.namePlaceholder.fontSize / imageNaturalSize.height) * 100}vh`, fontFamily: posterTemplate.namePlaceholder.fontFamily, whiteSpace: 'nowrap' }} onMouseDown={(e) => startDrag(e, 'name', false)} onTouchStart={(e) => startDrag(e, 'name', false)}>
                    <FaPen className="mr-1 inline text-xs" /> Your Name
                    <div className="absolute top-0 left-0 w-full h-full border-2 border-green-500 bg-green-500/10 -z-10" />
                  </div>
                </div>
              ) : (
                <div className="aspect-video flex items-center justify-center text-gray-400 flex-col p-8"><FaImage className="text-3xl mb-2" /><p className="text-sm">Select a background</p></div>
              )}
              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-[10px] px-2 py-1 rounded flex items-center gap-1"><FaArrowsAlt className="text-[10px]" /> Drag to position</div>
            </div>
            <div><label className="block text-xs font-medium text-gray-700 mb-2">Background</label><div className="flex flex-wrap gap-2 mb-2">{SAMPLE_BACKGROUNDS.map((sample, idx) => (<button key={idx} type="button" onClick={() => applySampleBackground(idx)} className={`w-12 h-12 rounded-lg border-2 overflow-hidden ${selectedSample === idx ? 'border-blue-500 shadow-md' : 'border-gray-200'}`}><img src={sample.url} alt={sample.label} className="w-full h-full object-cover" /></button>))}<label className="cursor-pointer"><div className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center hover:border-blue-500 transition-colors"><FaPlus className="text-gray-400" /></div><input type="file" accept="image/*" onChange={handlePosterImageSelect} className="hidden" /></label></div></div>
            <div className="space-y-3">
              <div><label className="block text-xs text-gray-500 mb-1">Name Font Size</label><input type="number" value={posterTemplate.namePlaceholder.fontSize} onChange={(e) => updatePosterNamePlaceholder('fontSize', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Name Color</label><input type="color" value={posterTemplate.namePlaceholder.color} onChange={(e) => updatePosterNamePlaceholder('color', e.target.value)} className="w-full h-10 p-1 border border-gray-200 rounded-lg" /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Font Family</label><select value={posterTemplate.namePlaceholder.fontFamily} onChange={(e) => updatePosterNamePlaceholder('fontFamily', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"><option value="Arial">Arial</option><option value="Helvetica">Helvetica</option><option value="Georgia">Georgia</option><option value="Times New Roman">Times New Roman</option><option value="Courier New">Courier New</option><option value="Verdana">Verdana</option></select></div>
              <div><label className="block text-xs text-gray-500 mb-1">Photo Border Radius (px)</label><input type="number" value={posterTemplate.photoPlaceholder.borderRadius || 0} onChange={(e) => updatePhotoBorderRadius(e.target.value)} min="0" max="200" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
            </div>
          </div>
        );
      default: return null;
    }
  };

  return (
    <EventDashboardSidebar>
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-0 sm:px-4 md:px-6 py-4 sm:py-8">
          <div className="bg-white rounded-none sm:rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6 mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button onClick={() => navigate(`/dashboard/events/${id}`)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors"><FaArrowLeft className="text-gray-600 text-sm" /></button>
                <div><h1 className="text-xl sm:text-2xl font-bold text-gray-900">Edit Event</h1><p className="text-sm text-gray-500 hidden sm:block">Update your event details</p></div>
              </div>
              <button onClick={handleSubmit} disabled={isUpdating || isUpdatingForm} className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all shadow-sm hover:shadow-md disabled:opacity-50 text-sm sm:text-base w-full sm:w-auto">
                <FaSave className="text-sm" /> {isUpdating ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
          <div className="hidden sm:block">{renderDesktopLayout()}</div>
          <div className="sm:hidden">{renderMobileLayout()}</div>
        </div>
      </div>
    </EventDashboardSidebar>
  );
};

export default EventDashboardEditEvent;