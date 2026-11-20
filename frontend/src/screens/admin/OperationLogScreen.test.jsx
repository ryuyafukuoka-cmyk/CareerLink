import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { expect, it, vi } from 'vitest';
import { listOperationLogs } from '@/api/operationLogs.js';
import OperationLogScreen from './OperationLogScreen.jsx';

vi.mock('@/api/users.js', () => ({ listUsers: async () => [] }));
vi.mock('@/api/operationLogs.js', () => ({ listOperationLogs: vi.fn() }));

it('restores a bookmarked filter, labels old rows and sends the API type for each selection', async () => {
    const user = userEvent.setup();
    listOperationLogs.mockImplementation(async ({ operationType }) => ({
        items: [
            {
                logId: '1',
                operatedAt: '2026-11-20T09:00:00+09:00',
                targetType: operationType.endsWith('Round') ? 'round' : 'record',
                operationType:
                    operationType === 'createApplicationRound' ? 'createRound' : operationType,
                result: 'success',
            },
        ],
        totalCount: 1,
        page: 1,
        pageSize: 10,
    }));

    render(
        <MemoryRouter initialEntries={['/?operationType=createRound']}>
            <OperationLogScreen />
        </MemoryRouter>,
    );
    const select = screen.getByRole('combobox', { name: '操作種別' });
    expect(select).toHaveValue('createApplicationRound');
    const table = within(await screen.findByRole('table'));
    expect(table.getByText('応募回の登録')).toBeInTheDocument();
    expect(listOperationLogs).toHaveBeenLastCalledWith({
        operationType: 'createApplicationRound',
        page: 1,
    });

    for (const [type, label] of [
        ['updateApplicationRound', '選考進捗の変更'],
        ['createActivityRecord', '活動記録の登録'],
        ['saveDraft', '活動記録の下書き保存'],
        ['completeActivityRecord', '活動記録の完了'],
        ['updateActivityRecord', '活動記録の編集'],
        ['deleteActivityRecord', '活動記録の削除'],
    ]) {
        await user.selectOptions(select, label);
        await user.click(screen.getByRole('button', { name: '検索' }));
        expect(await screen.findByRole('cell', { name: label })).toBeInTheDocument();
        expect(listOperationLogs).toHaveBeenLastCalledWith({ operationType: type, page: 1 });
    }
});
