import { useEffect, useState } from "react";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useToast } from "../components/ToastContext";
import Modal from "../components/Modal";
import { Plus, Search, Home, Pencil, Trash2, Loader2, Users } from "lucide-react";
import useRealTimeRefresh from "../hooks/useRealTimeRefresh";
import { useLanguage } from "../LanguageContext";

export default function Rooms() {
  const { formatMoney } = useSettings();
  const { addToast } = useToast();
  const roomTypes = [
    { value: "Standard", label: "Standard", desc: "Basic room with essential facilities" },
    { value: "Superior", label: "Superior", desc: "Better/larger than Standard" },
    { value: "Deluxe", label: "Deluxe", desc: "More spacious and upgraded facilities" },
    { value: "Premium", label: "Premium", desc: "Higher-end room with better amenities/view" },
    { value: "Executive", label: "Executive", desc: "Designed for business/VIP guests" },
    { value: "Family Room", label: "Family Room", desc: "Designed for families, usually more beds" },
  ];
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);
  const { t } = useLanguage();

  const [formData, setFormData] = useState({
    roomNumber: "",
    floor: "1",
    roomType: "Standard",
    maxGuests: "2",
    basePrice: "",
    extraBedPrice: "0",
    overtimeHourlyRate: "0",
  });

  const loadRooms = async () => {
    try {
      const response = await api.get("/rooms");
      setRooms(response.data);
    } catch (error) {
      addToast("Failed to load rooms", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRooms();
  }, []);
  useRealTimeRefresh(loadRooms, ["rooms:updated"]);

  const handleOpenModal = (room = null) => {
    setEditingRoom(room);
    if (room) {
      setFormData({
        roomNumber: room.roomNumber,
        floor: String(room.floor || 1),
        roomType: room.roomType,
        maxGuests: String(room.maxGuests || 2),
        basePrice: String(room.basePrice),
        extraBedPrice: String(room.extraBedPrice || 0),
        overtimeHourlyRate: String(room.overtimeHourlyRate || 0),
      });
    } else {
      setFormData({
        roomNumber: "",
        floor: "1",
        roomType: "Standard",
        maxGuests: "2",
        basePrice: "",
        extraBedPrice: "0",
        overtimeHourlyRate: "0",
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        roomNumber: formData.roomNumber,
        floor: Number(formData.floor),
        roomType: formData.roomType,
        maxGuests: Number(formData.maxGuests),
        basePrice: Number(formData.basePrice),
        extraBedPrice: Number(formData.extraBedPrice),
        overtimeHourlyRate: Number(formData.overtimeHourlyRate),
      };

      if (editingRoom) {
        await api.patch(`/rooms/${editingRoom._id}`, payload);
        addToast("Room updated successfully");
      } else {
        await api.post("/rooms", payload);
        addToast("Room created successfully");
      }
      setIsModalOpen(false);
      loadRooms();
    } catch (error) {
      addToast(error.response?.data?.message || "Failed to save room", "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to disable this room?")) return;
    try {
      await api.delete(`/rooms/${id}`);
      addToast("Room disabled");
      loadRooms();
    } catch (error) {
      addToast("Failed to disable room", "error");
    }
  };

  const filteredRooms = rooms.filter(room =>
    room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.roomType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusColors = {
    available: "bg-emerald-100 text-emerald-700",
    occupied: "bg-red-100 text-red-700",
    reserved: "bg-blue-100 text-blue-700",
    cleaning: "bg-amber-100 text-amber-700",
    maintenance: "bg-orange-100 text-orange-700",
    blocked: "bg-gray-100 text-gray-600",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t("roomsTitle")}</h1>
          <p className="text-gray-500 text-sm mt-1">{t("roomsSubtitle")}</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all active:scale-95"
        >
          <Plus className="w-5 h-5" /> {t("addNewRoom")}
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder={t("roomSearchPlaceholder")}
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-200 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mr-3" /> Loading rooms...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t("room")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t("type")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t("capacity")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t("floor")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t("pricePerNight")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{t("status")}</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredRooms.map((room) => (
                  <tr key={room._id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                          <Home className="w-5 h-5" />
                        </div>
                        <span className="font-bold text-gray-900">{room.roomNumber}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-600 font-medium">{room.roomType}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600">
                        <Users className="w-3 h-3" /> {room.maxGuests || 2}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-600">{room.floor}</td>
                    <td className="px-6 py-4 font-semibold text-gray-900">{formatMoney(room.basePrice)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${statusColors[room.status] || "bg-gray-100 text-gray-600"}`}>
                        {room.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenModal(room)}
                          className="p-2 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                        >
                          <Pencil className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => handleDelete(room._id)}
                          className="p-2 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRooms.length === 0 && (
              <div className="text-center py-16 text-gray-400">No rooms found.</div>
            )}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingRoom ? t("editRoom") : t("addNewRoom")}
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="label-primary">{t("roomNumber")}</label>
              <input
                type="text"
                className="input-primary"
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label-primary">{t("roomType")}</label>
              <select
                name="roomType"
                value={formData.roomType}
                onChange={(e) => setFormData({ ...formData, roomType: e.target.value })}
                className="input-primary"
              >
                {roomTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {roomTypes.find(t => t.value === formData.roomType)?.desc || ""}
              </p>
            </div>
            <div>
              <label className="label-primary">{t("maxGuests")}</label>
              <select
                name="maxGuests"
                value={formData.maxGuests}
                onChange={(e) => setFormData({ ...formData, maxGuests: e.target.value })}
                className="input-primary"
              >
                <option value="1">1 Person (Single)</option>
                <option value="2">2 Persons (Double)</option>
                <option value="3">3 Persons</option>
                <option value="4">4 Persons (Family)</option>
                <option value="5">5 Persons</option>
                <option value="6">6 Persons (Large Family)</option>
                <option value="8">8 Persons (Group)</option>
                <option value="10">10 Persons (Group)</option>
              </select>
            </div>
            <div>
              <label className="label-primary">{t("floor")}</label>
              <input
                type="number"
                className="input-primary"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
              />
            </div>
            <div>
              <label className="label-primary">{t("basePrice")}</label>
              <input
                type="number"
                className="input-primary"
                value={formData.basePrice}
                onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label-primary">{t("extraBedPrice")}</label>
              <input
                type="number"
                className="input-primary"
                value={formData.extraBedPrice}
                onChange={(e) => setFormData({ ...formData, extraBedPrice: e.target.value })}
              />
            </div>
            <div>
              <label className="label-primary">{t("overtimeRate")}</label>
              <input
                type="number"
                className="input-primary"
                value={formData.overtimeHourlyRate}
                onChange={(e) => setFormData({ ...formData, overtimeHourlyRate: e.target.value })}
              />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              className="flex-1 px-6 py-3 rounded-xl bg-indigo-600 text-white font-semibold shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 transition-all"
            >
              {editingRoom ? t("saveChanges") : t("createRoom")}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}