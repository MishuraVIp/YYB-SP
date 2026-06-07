import os
import sys
import wave
# pyrefly: ignore [missing-import]
from google import genai
# pyrefly: ignore [missing-import]
from google.genai import types

# Get API key from environment variables (GEMINI_API_KEY)
api_key = os.environ.get("GEMINI_API_KEY")

if not api_key:
    print("Ошибка: Переменная окружения GEMINI_API_KEY не установлена.")
    print("Пожалуйста, установите её перед запуском скрипта.")
    sys.exit(1)

client = genai.Client(api_key=api_key)

text = """
Юрий Юрьевич Бесчастнов, с позывным «Юрген» — настоящий герой нашего времени, чей жизненный путь стал примером невероятного мужества, верности долгу и глубокой любви к своей семье и Родине. 
Он родился первого ноября тысяча девятьсот девяносто пятого года в деревне Шубино Ярославской области, куда его семья незадолго до этого была вынуждена бежать из Узбекистана, спасаясь от Ферганских погромов. 
С детства Юрий рос сильным, выносливым и ответственным человеком. Он увлекался гиревым спортом, завоевывал призовые места и прекрасно играл на гитаре. 
В две тысячи восемнадцатом году Юрий связал свою жизнь с армией. Его верность долгу ковалась на полигонах Белоруссии и в песках Сирии, где он провел полгода на боевом посту и был награжден медалью. 
В сентябре две тысячи двадцатого года Юрий встретил любовь своей жизни — Ксению. Он ухаживал за ней красиво и нежно, оберегая от всех забот. Шестого августа две тысячи двадцать первого года они поженились, а весной две тысячи двадцать пятого года у них родился долгожданный сын Артём.
С самого начала специальной военной операции Юрий находился на передовой в пехоте. Он штурмовал опорные пункты противника, проявляя нереальную храбрость. Был трижды ранен, перенес тяжелые операции в госпитале Бурденко, но каждый раз возвращался в строй, переведясь в подразделение беспилотных летательных аппаратов. 
Трагическая гибель младшего брата Никиты на фронте в сентябре две тысячи двадцать пятого года стала тяжелым ударом для Юрия, но он продолжал выполнять свой долг. 
Двадцать второго января две тысячи двадцать шестого года, отправив супруге последнее сообщение со словами любви, Юрий ушел на боевую задачу и погиб. 
Помним. Любим. Чтим. Его имя навечно останется в наших сердцах.
"""

print("\nЗапуск генерации озвучки через Gemini API...")

try:
    response = client.models.generate_content(
        model='gemini-2.5-flash-preview-tts',  # Специализированная модель для TTS
        contents="Зачитай вслух следующий текст спокойным, уважительным, повествовательным голосом без каких-либо изменений:\n\n" + text,
        config=types.GenerateContentConfig(
            response_modalities=["AUDIO"],
            speech_config=types.SpeechConfig(
                voice_config=types.VoiceConfig(
                    prebuilt_voice_config=types.PrebuiltVoiceConfig(
                        voice_name="Puck"  # Доступные голоса: Puck, Charon, Kore, Fenrir, Aoede
                    )
                )
            )
        )
    )
    
    # Извлекаем аудио-байты
    parts = response.candidates[0].content.parts
    audio_part = next((p for p in parts if p.inline_data), None)
    if not audio_part:
        print("Ошибка: API не вернул аудиоданные.")
        sys.exit(1)
        
    audio_bytes = audio_part.inline_data.data
    
    output_path = r"c:\Users\Redmi\Desktop\avito_site\audio\voiceover.wav"
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    
    with wave.open(output_path, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2) # 16-bit
        wav_file.setframerate(24000)
        wav_file.writeframes(audio_bytes)
        
    print(f"\nУспех! Новая озвучка создана и сохранена в: {output_path}")
    print(f"Размер файла: {os.path.getsize(output_path)/1024:.1f} КБ")
except Exception as e:
    print(f"\nОшибка при генерации аудио: {e}")
