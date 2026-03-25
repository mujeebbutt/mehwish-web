// admin.js - handles LMS Dashboard interaction
document.addEventListener('DOMContentLoaded', () => {
    // Basic auth check
    fetch('/api/check-auth').then(res => res.json()).then(data => {
        if (!data.authenticated || data.role !== 'admin') {
            window.location.href = '/admin/adminlogin.html';
        }
    });

    // Logout
    document.getElementById('logout-button')?.addEventListener('click', async () => {
        await fetch('/api/logout', { method: 'POST' });
        window.location.href = '/admin/adminlogin.html';
    });

    // Populate Dropdowns & Data
    async function loadData() {
        try {
            // Fetch Students
            const stdRes = await fetch('/api/admin/students');
            const students = await stdRes.json();
            const studentTableBody = document.querySelector('#students-table tbody');
            if (studentTableBody) studentTableBody.innerHTML = '';

            studentSelects.forEach(select => {
                if (select) {
                    select.innerHTML = '<option value="">-- Select Student --</option>';
                    students.forEach(s => select.innerHTML += `<option value="${s.id}">${s.name} (${s.email})</option>`);
                }
            });

            if (studentTableBody && students.length > 0) {
                students.forEach(s => {
                    studentTableBody.innerHTML += `
                        <tr class="hover:bg-surface-container-low transition-colors border-b border-surface-container last:border-0">
                            <td class="py-4 pr-6 text-sm font-bold">#${s.id}</td>
                            <td class="py-4 pr-6 text-sm font-bold text-[#00A3C1] whitespace-nowrap">${s.name}</td>
                            <td class="py-4 pr-6 text-sm">
                                <span class="block text-gray-800 font-medium">${s.email}</span>
                                <span class="block text-gray-500 text-xs">${s.phone || 'N/A'}</span>
                            </td>
                            <td class="py-4 pr-6 text-sm">
                                <span class="block text-gray-800 font-bold">${s.grade || 'N/A'}</span>
                                <span class="block text-gray-500 text-xs">${s.class || s.major || 'None'}</span>
                            </td>
                            <td class="py-4 text-sm font-black text-green-600">${s.duration || 'Standard'}</td>
                        </tr>
                    `;
                });
            } else if (studentTableBody) {
                studentTableBody.innerHTML = '<tr><td colspan="5" class="py-6 text-center text-sm text-gray-500">No students found.</td></tr>';
            }


            // Fetch Subjects
            const subRes = await fetch('/api/admin/subjects');
            const subjects = await subRes.json();
            const subjectSelects = [document.getElementById('lesson-subject-id'), document.getElementById('enroll-subject-id'), document.getElementById('subject-id'), document.getElementById('assignment-subject-id'), document.getElementById('attendance-subject-id')];
            const subjectsTableBody = document.querySelector('#subjects-table tbody');
            if (subjectsTableBody) subjectsTableBody.innerHTML = '';

            subjectSelects.forEach(select => {
                if (select) {
                    select.innerHTML = '<option value="">-- Select Subject --</option>';
                    subjects.forEach(s => select.innerHTML += `<option value="${s.id}">${s.name}</option>`);
                }
            });

            if (subjectsTableBody) {
                subjects.forEach(s => {
                    subjectsTableBody.innerHTML += `<tr><td>${s.id}</td><td>${s.name}</td></tr>`;
                });
            }
        } catch (e) { console.error('Error loading data', e); }
    }

    loadData();

    // Subject Add
    document.getElementById('subject-add-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const res = await fetch('/api/admin/subjects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: document.getElementById('subject-name').value })
        });
        const result = await res.json();
        document.getElementById('subject-message').innerText = result.message;
        if (res.ok) { document.getElementById('subject-add-form').reset(); loadData(); }
    });

    // Lesson Add
    document.getElementById('lesson-add-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const res = await fetch('/api/admin/lessons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject_id: document.getElementById('lesson-subject-id').value,
                title: document.getElementById('lesson-title').value,
                video_url: document.getElementById('lesson-video').value,
                content: document.getElementById('lesson-content').value,
                order_index: document.getElementById('lesson-order').value
            })
        });
        const result = await res.json();
        document.getElementById('lesson-message').innerText = result.message;
        if (res.ok) document.getElementById('lesson-add-form').reset();
    });

    // Enrollment Add
    document.getElementById('enrollment-add-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const res = await fetch('/api/admin/enrollments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                student_id: document.getElementById('enroll-student-id').value,
                subject_id: document.getElementById('enroll-subject-id').value
            })
        });
        const result = await res.json();
        document.getElementById('enroll-message').innerText = result.message;
        if (res.ok) document.getElementById('enrollment-add-form').reset();
    });

    // Assignment Add
    document.getElementById('assignment-add-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const res = await fetch('/api/admin/assignments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                subject_id: document.getElementById('assignment-subject-id').value,
                title: document.getElementById('assignment-title').value,
                description: document.getElementById('assignment-description').value,
                due_date: document.getElementById('assignment-due-date').value
            })
        });
        const result = await res.json();
        alert(result.message);
        if (res.ok) document.getElementById('assignment-add-form').reset();
    });

    // Add Grade Form
    document.getElementById('grade-add-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            student_id: parseInt(document.getElementById('student-id').value),
            subject_id: parseInt(document.getElementById('subject-id').value),
            marks_obtained: document.getElementById('marks-obtained').value,
            total_marks: document.getElementById('total-marks').value,
            grade: document.getElementById('grade').value,
            remarks: document.getElementById('remarks').value
        };
        const res = await fetch('/api/admin/grades', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        alert(result.message);
        if (res.ok) document.getElementById('grade-add-form').reset();
    });

    // Mark Attendance Form
    document.getElementById('attendance-add-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            student_id: parseInt(document.getElementById('attendance-student-id').value),
            subject_id: parseInt(document.getElementById('attendance-subject-id').value),
            date: document.getElementById('attendance-date').value,
            status: document.getElementById('attendance-status').value
        };
        const res = await fetch('/api/admin/attendance', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        document.getElementById('attendance-message').innerText = result.message;
        if (res.ok) document.getElementById('attendance-add-form').reset();
    });
});