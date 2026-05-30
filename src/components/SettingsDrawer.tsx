import { SettingsPanel, type SettingsPanelProps } from './SettingsPanel'
import { Button } from './ui/Button'
import { Drawer } from './ui/Drawer'

type SettingsDrawerProps = SettingsPanelProps & {
  open: boolean
  onClose: () => void
}

export function SettingsDrawer({ open, onClose, ...settings }: SettingsDrawerProps) {
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title="练习设置"
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
