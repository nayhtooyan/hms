import { useEffect, useState } from "react";
import api from "../api";
import { useSettings } from "../SettingsContext";
import { useToast } from "../components/ToastContext";
import { useLanguage } from "../LanguageContext";
import Modal from "../components/Modal";
import useRealTimeRefresh from "../hooks/useRealTimeRefresh";
import { Plus, Search, Pencil, Trash2, Users } from "lucide-react";

const roomTypes = [
  { value: "Standard", key: "standardRoom" },
  { value: "Superior", key: "superiorRoom" },
  { value: "Deluxe", key: "deluxeRoom" },
  { value: "Premium", key: "premiumRoom" },
  { value: "Executive", key: "executiveRoom" },
  { value: "Family Room", key: "familyRoomType" },
];

export default function Rooms() {
  const { formatMoney } = useSettings();
  const { addToast } = useToast();
  const { t } = useLanguage();

  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState(null);

  const [formData, setFormData] = useState({
    roomNumber: "", floor: "1", roomType: "Standard", maxGuests: "2",
    basePrice: "", extraBedPrice: "0", overtimeHourlyRate: "0",
  });

  const loadRooms = async () => {
    try {
      const response = await api.get("/rooms");
      setRooms(response.data);
    } catch (error) {
      addToast(t("error"), "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadRooms(); }, []);
  useRealTimeRefresh(loadRooms, ["rooms:updated"]);

  const handleOpenModal = (room = null) => {
    setEditingRoom(room);
    if (room) {
      setFormData({
        roomNumber: room.roomNumber, floor: String(room.floor || 1), roomType: room.roomType,
        maxGuests: String(room.maxGuests || 2), basePrice: String(room.basePrice),
        extraBedPrice: String(room.extraBedPrice || 0), overtimeHourlyRate: String(room.overtimeHourlyRate || 0),
      });
    } else {
      setFormData({ roomNumber: "", floor: "1", roomType: "Standard", maxGuests: "2", basePrice: "", extraBedPrice: "0", overtimeHourlyRate: "0" });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        roomNumber: formData.roomNumber, floor: Number(formData.floor), roomType: formData.roomType,
        maxGuests: Number(formData.maxGuests), basePrice: Number(formData.basePrice),
        extraBedPrice: Number(formData.extraBedPrice), overtimeHourlyRate: Number(formData.overtimeHourlyRate),
      };
      if (editingRoom) {
        await api.patch(`/rooms/${editingRoom._id}`, payload);
        addToast(t("roomUpdated"));
      } else {
        await api.post("/rooms", payload);
        addToast(t("roomCreated"));
      }
      setIsModalOpen(false);
      loadRooms();
    } catch (error) {
      addToast(error.response?.data?.message || t("error"), "error");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t("disableRoomConfirm"))) return;
    try {
      await api.delete(`/rooms/${id}`);
      addToast(t("roomDisabled"));
      loadRooms();
    } catch (error) {
      addToast(t("error"), "error");
    }
  };

  const filteredRooms = rooms.filter(room => room.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) || room.roomType.toLowerCase().includes(searchTerm.toLowerCase()));

  const statusStyles = {
    available: "badge-emerald", occupied: "badge-red", reserved: "badge-blue",
    cleaning: "badge-amber", maintenance: "badge-amber", blocked: "badge-gray",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title-dark">{t("roomsTitle")}</h1>
          <p className="page-subtitle-dark">{t("roomsSubtitle")}</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" /> {t("addNewRoom")}
        </button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
        <input type="text" placeholder={t("roomSearchPlaceholder")} className="input-dark pl-11" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
      </div>

      <div className="card-dark overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-gray-500">{t("loading")}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-dark">
              <thead>
                <tr>
                  <th>{t("room")}</th>
                  <th>{t("type")}</th>
                  <th>{t("capacity")}</th>
                  <th>{t("floor")}</th>
                  <th>{t("pricePerNight")}</th>
                  <th>{t("status")}</th>
                  <th className="text-right">{t("actions")}</th>
                </tr>
              </thead>
              <tbody>
                {filteredRooms.map((room) => (
                  <tr key={room._id}>
                    <td className="font-bold text-white">{room.roomNumber}</td>
                    <td>{t(roomTypes.find(rt => rt.value === room.roomType)?.key || "standardRoom")}</td>
                    <td><span className="badge-purple flex items-center gap-1 w-fit"><Users className="w-3 h-3" /> {room.maxGuests || 2}</span></td>
                    <td>{room.floor}</td>
                    <td className="font-semibold text-white">{formatMoney(room.basePrice)}</td>
                    <td><span className={statusStyles[room.status] || "badge-gray"}>{t(room.status)}</span></td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button onClick={() => handleOpenModal(room)} className="p-2 rounded-lg text-gray-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"><Pencil className="w-5 h-5" /></button>
                        <button onClick={() => handleDelete(room._id)} className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"><Trash2 className="w-5 h-5" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredRooms.length === 0 && <div className="text-center py-16 text-gray-500">{t("noData")}</div>}
          </div>
        )}
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingRoom ? t("editRoom") : t("addNewRoom")}>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div><label className="label-dark">{t("roomNumber")}</label><input type="text" className="input-dark" value={formData.roomNumber} onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })} required /></div>
            <div>
              <label className="label-dark">{t("roomType")}</label>
              <select name="roomType" value={formData.roomType} onChange={(e) => setFormData({ ...formData, roomType: e.target.value })} className="input-dark">
                {roomTypes.map((type) => <option key={type.value} value={type.value}>{t(type.key)}</option>)}
              </select>
            </div>
            <div>
              <label className="label-dark">{t("maxGuests")}</label>
              <select name="maxGuests" value={formData.maxGuests} onChange={(e) => setFormData({ ...formData, maxGuests: e.target.value })} className="input-dark">
                <option value="1">{t("singleRoom")}</option>
                <option value="2">{t("doubleRoom")}</option>
                <option value="3">{t("threePerson")}</option>
                <option value="4">{t("familyRoom")}</option>
                <option value="5">{t("fivePerson")}</option>
                <option value="6">{t("largeFamily")}</option>
                <option value="8">{t("groupRoom8")}</option>
                <option value="10">{t("groupRoom10")}</option>
              </select>
            </div>
            <div><label className="label-dark">{t("floor")}</label><input type="number" className="input-dark" value={formData.floor} onChange={(e) => setFormData({ ...formData, floor: e.target.value })} /></div>
            <div><label className="label-dark">{t("basePrice")}</label><input type="number" className="input-dark" value={formData.basePrice} onChange={(e) => setFormData({ ...formData, basePrice: e.target.value })} required /></div>
            <div><label className="label-dark">{t("extraBedPrice")}</label><input type="number" className="input-dark" value={formData.extraBedPrice} onChange={(e) => setFormData({ ...formData, extraBedPrice: e.target.value })} /></div>
            <div><label className="label-dark">{t("overtimeRate")}</label><input type="number" className="input-dark" value={formData.overtimeHourlyRate} onChange={(e) => setFormData({ ...formData, overtimeHourlyRate: e.target.value })} /></div>
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 btn-secondary">{t("cancel")}</button>
            <button type="submit" className="flex-1 btn-primary">{editingRoom ? t("saveChanges") : t("createRoom")}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}