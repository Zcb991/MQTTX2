<template>
  <div class="leftbar">
    <div class="app-logo leftbar-top leftbar-item">
      <a :href="siteLink" target="_blank" rel="noopener noreferrer">
        <img src="@/assets/images/app-logo.png" alt="app-logo" />
      </a>
    </div>
    <section class="leftbar-center">
      <template v-if="!isNewWindow">
        <div :class="[{ active: isConnection }, 'leftbar-item']">
          <a href="javascript:;" @click="routeToPage('/recent_connections')">
            <i class="iconfont icon-connections"></i>
          </a>
        </div>
        <div :class="[{ active: isCreate }, 'leftbar-item']">
          <a href="javascript:;" @click="routeToPage('/recent_connections/0?oper=create')">
            <i class="iconfont icon-new"></i>
          </a>
        </div>
        <div :class="[{ active: isScript }, 'leftbar-item']">
          <a href="javascript:;" @click="routeToPage('/script')">
            <i class="iconfont icon-script"></i>
          </a>
        </div>
        <div :class="[{ active: isLog }, 'leftbar-item']">
          <a href="javascript:;" @click="routeToPage('/log')">
            <i class="iconfont icon-log"></i>
          </a>
        </div>
      </template>
    </section>

    <section v-if="!isNewWindow" class="leftbar-bottom">
      <div :class="[{ active: isSettings }, 'leftbar-item']">
        <a href="javascript:;" @click="routeToPage('/settings')">
          <i class="iconfont icon-settings"></i>
        </a>
      </div>
      <div :class="[{ active: isHelp }, 'leftbar-item']">
        <a href="javascript:;" @click="routeToPage('/help')">
          <i class="iconfont icon-mqtt"></i>
        </a>
      </div>
       <div :class="[{ active: isTest1 }, 'leftbar-item']">
        <a href="javascript:;" @click="routeToPage('/test1')">
      <!-- <div :class="[{ active: isAbout }, 'leftbar-item']"> -->
        <!-- <a href="javascript:;" @click="routeToPage('/about')"> -->
          <i class="iconfont icon-about"></i>
        </a>
      </div>
    </section>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { Getter, Action } from 'vuex-class'
import gaCustomLinks from '@/utils/gaCustomLinks'

@Component
export default class Leftbar extends Vue {
  @Getter('currentLang') private getterLang!: Language
  // 从vuex加载showConnections属性
  @Getter('showConnections') private getterShowConnections!: boolean

  @Action('TOGGLE_CONNECTIONS_VISIBLE') private toggleConnectionsVisible!: (payload: { showConnections: boolean }) => void

  private showConnections = true

  get siteLink(): string {
    return gaCustomLinks(this.getterLang).leftBarLogo
  }
  get isConnection(): boolean {
    return ['Connections', 'ConnectionDetails'].includes(this.$route.name || '') && this.$route.query.oper !== 'create'
  }
  get isCreate(): boolean {
    return this.$route.name === 'ConnectionDetails' && this.$route.query.oper === 'create'
  }
  get isSettings(): boolean {
    return this.$route.path === '/settings'
  }
  get isAbout(): boolean {
    return this.$route.path === '/about'
  }
  get isScript(): boolean {
    return this.$route.path === '/script'
  }
  get isLog(): boolean {
    return this.$route.path === '/log'
  }
  get isNewWindow(): boolean {
    return this.$route.name === 'newWindow'
  }
  get isHelp(): boolean {
    return this.$route.path === '/help'
  }

  get isTest1(): boolean {
    return this.$route.path === '/test1'
  }

  private routeToPage(path: string) {
    // console.log(path === '/recent_connections')
    console.log('path：', path);

    // 如果当前路径是recent_connections，则把showConnections进行取反
    if (path === '/recent_connections') {
      console.log('当前的showConnections：', this.showConnections)
      this.showConnections = !this.showConnections
      console.log('取反后showConnections：', this.showConnections)
      // 交给vuex去修改属性值
      this.toggleConnectionsVisible({ showConnections: this.showConnections })
      console.log('真正的值', this.getterShowConnections)
      //   return

    }

    // 如果当前路径是/recent_connections/0?oper=create，则把showConnections设置成true
    if (path === '/recent_connections/0?oper=create') {
      this.showConnections = true
      // 交给vuex去修改属性值
      this.toggleConnectionsVisible({ showConnections: this.showConnections })
    }

    this.$router
      .push({
        path,
      })
      .catch(() => {})
  }

  private async created() {
    this.showConnections = this.getterShowConnections
    console.log('getterShowConnections', this.getterShowConnections)
    console.log('LeftBar', this.showConnections)
  }
}
</script>

<style lang="scss">
@import '~@/assets/scss/variable.scss';
.leftbar {
  position: fixed;
  width: 80px;
  top: 0;
  bottom: 0;
  background: linear-gradient(135deg, var(--color-bg-leftbar_top) 0%, var(--color-bg-leftbar_bottom) 100%);
  padding: 45px 0;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  -webkit-app-region: drag;
  & > .leftbar-top {
    flex: 1;
  }
  & > .leftbar-center {
    flex: 3;
  }
  & > .leftbar-bottom {
    flex: 0;
  }
  .leftbar-item {
    text-align: center;
    margin-bottom: 20px;
    position: relative;
    a {
      height: 48px;
      width: 48px;
      line-height: 48px;
      display: inline-block;
    }
    &.active a {
      background-color: var(--color-bg-leftbar_item);
      border-radius: 8px;
    }
    &.active a,
    a:hover {
      .iconfont {
        color: var(--color-main-white);
      }
    }
    &:last-child {
      margin-bottom: 0px;
    }
  }
  .app-logo {
    img {
      width: 40px;
      height: 40px;
    }
  }
  .iconfont {
    color: var(--color-text-leftbar_icon);
  }
  .leftbar-center .iconfont {
    font-size: 24px;
  }
  .leftbar-bottom .iconfont {
    font-size: 20px;
  }
}
</style>
