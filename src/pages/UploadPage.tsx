import { useState, useRef } from 'react';
import { Upload, Music, Image, X, CheckCircle, Loader } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { genres } from '@data/mockData';
import { useAuth } from '@context/AuthContext';
import { uploadTrack } from '@services/uploadService';
import { addNotification } from '@services/notificationService';
import { Input } from '@components/ui/input';
import { Textarea } from '@components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
import { Checkbox } from '@components/ui/checkbox';
import { Button } from '@components/ui/button';
import { Progress } from '@components/ui/progress';

const TAGS_OPTIONS = ['Instrumentaal', 'Akoestisch', 'Live opname', 'Demo', 'Remix', 'Cover', 'Origineel', 'Samenwerking'];

export default function UploadPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dragOver, setDragOver] = useState(false);
  const [artworkDragOver, setArtworkDragOver] = useState(false);
  const [trackFile, setTrackFile] = useState(null);
  const [artworkFile, setArtworkFile] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [uploadState, setUploadState] = useState('idle'); // idle | uploading | success
  const [uploadProgress, setUploadProgress] = useState(0);
  const [form, setForm] = useState({
    title: '',
    genre: '',
    description: '',
    explicit: false,
    privateTrack: false,
  });

  const fileRef = useRef();
  const artworkRef = useRef();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) setTrackFile(file);
  };

  const handleArtworkDrop = (e) => {
    e.preventDefault();
    setArtworkDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) setArtworkFile(file);
  };

  const toggleTag = (tag) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleUpload = () => {
    setUploadState('uploading');
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          // After progress hits 100, save the track metadata
          uploadTrack({
            title: form.title || trackFile?.name || 'Naamloos',
            genre: form.genre,
            description: form.description,
            tags: selectedTags,
            explicit: form.explicit,
            isPrivate: form.privateTrack,
            userId: user?.id,
            artistName: user?.displayName || user?.username,
          }).then(track => {
            if (user?.id) {
              addNotification(user.id, {
                type: 'system',
                title: 'Upload ontvangen',
                body: `"${track.title}" is ingediend en wacht op goedkeuring`,
                link: '/profiel',
              });
            }
            setUploadState('success');
          });
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 300);
  };

  const handleReset = () => {
    setUploadState('idle');
    setUploadProgress(0);
    setTrackFile(null);
    setArtworkFile(null);
    setSelectedTags([]);
    setForm({ title: '', genre: '', description: '', explicit: false, privateTrack: false });
  };

  if (uploadState === 'success') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-3">Upload ontvangen!</h2>
        <p className="text-slate-400 mb-2">
          <span className="text-white font-medium">"{form.title || trackFile?.name || 'Je nummer'}"</span> is ingediend voor beoordeling.
        </p>
        <p className="text-slate-500 text-sm mb-8">Ons team bekijkt je upload zo snel mogelijk. Je ontvangt een melding zodra het is goedgekeurd.</p>
        <div className="flex justify-center gap-3">
          <Button onClick={handleReset}>
            Nog een uploaden
          </Button>
          <Button onClick={() => navigate('/profiel')} variant="secondary">
            Mijn profiel bekijken
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 lg:px-6 py-10">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">Muziek uploaden</h1>
        <p className="text-slate-400">Deel je muziek met de h-orbit gemeenschap</p>
      </div>

      <div className="space-y-6">
        {/* Nummer drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current.click()}
          className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
            dragOver
              ? 'border-violet-500 bg-violet-600/10'
              : trackFile
              ? 'border-green-500/50 bg-green-500/5'
              : 'border-white/15 bg-white/2 hover:border-white/30 hover:bg-white/4'
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={e => e.target.files[0] && setTrackFile(e.target.files[0])}
          />
          {trackFile ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center">
                <Music size={26} className="text-green-400" />
              </div>
              <div>
                <p className="text-white font-semibold">{trackFile.name}</p>
                <p className="text-slate-400 text-sm">{(trackFile.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
              <button
                onClick={e => { e.stopPropagation(); setTrackFile(null); }}
                className="text-slate-400 hover:text-red-400 text-sm flex items-center gap-1 transition-colors"
              >
                <X size={14} /> Verwijderen
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${dragOver ? 'bg-violet-600/20' : 'bg-white/8'}`}>
                <Upload size={26} className={dragOver ? 'text-violet-400' : 'text-slate-400'} />
              </div>
              <div>
                <p className="text-white font-semibold text-lg">Sleep je nummer hierheen</p>
                <p className="text-slate-400 text-sm mt-1">of klik om te bladeren</p>
                <p className="text-slate-500 text-xs mt-2">Ondersteunde formaten: MP3, WAV, FLAC, AAC · Max 500MB</p>
              </div>
            </div>
          )}
        </div>

        {/* Uploadvoortgang */}
        {uploadState === 'uploading' && (
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-3">
              <Loader size={16} className="text-violet-400 animate-spin" />
              <span className="text-sm font-medium text-white">Uploaden...</span>
              <span className="text-sm text-slate-400 ml-auto">{Math.floor(uploadProgress)}%</span>
            </div>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        )}

        {/* Formulier */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">Nummertitel *</label>
            <Input
              type="text"
              placeholder="Voer nummertitel in"
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Genre</label>
            <Select value={form.genre} onValueChange={(val) => setForm({ ...form, genre: val })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecteer genre" />
              </SelectTrigger>
              <SelectContent>
                {genres.filter(g => g !== 'Alles').map(g => (
                  <SelectItem key={g} value={g}>{g}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Artwork</label>
            <div
              onDragOver={e => { e.preventDefault(); setArtworkDragOver(true); }}
              onDragLeave={() => setArtworkDragOver(false)}
              onDrop={handleArtworkDrop}
              onClick={() => artworkRef.current.click()}
              className={`flex items-center gap-3 border border-dashed rounded-xl px-4 py-3 cursor-pointer transition-all ${
                artworkDragOver
                  ? 'border-violet-500 bg-violet-600/10'
                  : artworkFile
                  ? 'border-green-500/50 bg-green-500/5'
                  : 'border-white/15 bg-white/2 hover:border-white/30'
              }`}
            >
              <input
                ref={artworkRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files[0] && setArtworkFile(e.target.files[0])}
              />
              <Image size={18} className={artworkFile ? 'text-green-400' : 'text-slate-500'} />
              <span className={`text-sm ${artworkFile ? 'text-green-400' : 'text-slate-400'}`}>
                {artworkFile ? artworkFile.name : 'Sleep artwork of klik om te bladeren'}
              </span>
            </div>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-2">Omschrijving</label>
            <Textarea
              placeholder="Vertel je luisteraars over dit nummer..."
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="resize-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-slate-300 mb-3">Labels</label>
            <div className="flex flex-wrap gap-2">
              {TAGS_OPTIONS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                    selectedTags.includes(tag)
                      ? 'bg-violet-600 text-white'
                      : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/10'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div className="sm:col-span-2 flex flex-wrap gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={form.explicit}
                onCheckedChange={(checked) => setForm({ ...form, explicit: checked })}
              />
              <span className="text-sm text-slate-300">Expliciete inhoud</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={form.privateTrack}
                onCheckedChange={(checked) => setForm({ ...form, privateTrack: checked })}
              />
              <span className="text-sm text-slate-300">Privénummer (alleen via link)</span>
            </label>
          </div>
        </div>

        {/* Verzenden */}
        <div className="flex justify-end gap-3 pt-2">
          <Button
            type="button"
            onClick={handleReset}
            variant="ghost"
          >
            Annuleren
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!trackFile || uploadState === 'uploading'}
          >
            {uploadState === 'uploading' ? (
              <><Loader size={16} className="animate-spin" /> Bezig met uploaden...</>
            ) : (
              <><Upload size={16} /> Nummer publiceren</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
