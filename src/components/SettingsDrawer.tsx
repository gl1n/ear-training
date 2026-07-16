import { SettingsPanel, type SettingsPanelProps } from './SettingsPanel'
import { Button } from '../common/ui/Button'
import { Drawer } from '../common/ui/Drawer'

type SettingsDrawerProps = SettingsPanelProps & {
  open: boolean
  onClose: () => void
}

export function SettingsDrawer({ open, onClose, ...settings }: SettingsDrawerProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="训练设置"
      footer={
        <Button onClick={onClose} className="w-full">
          完成
        </Button>
      }
    >
      <SettingsPanel {...settings} />
    </Drawer>
  )
}
